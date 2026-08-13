import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	assertCurrentEvidenceBinding,
	assertEvaluationSuiteBounds,
	currentEvidenceBinding,
	finalizeEvidence,
	parseRetainedRun,
	preflight,
	prepareCurrentTestCases,
	type RetainedAttempt,
	responseRequestFor,
	SCONJ_PROMPT_CACHE_POLICY,
	summarizeEvidence,
} from "../../docs/prototypes/grammatical-resolution-subordinating-conjunction/run";
import { subordinatingConjunctionGrammaticalResolutionExperiment } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-subordinating-conjunction/evaluation-suite";

const startedAt = "2020-01-01T10:00:00.000Z";
const completedAt = "2020-01-01T10:01:00.000Z";
const developmentPhase = { kind: "development", round: 1 } as const;
const acceptancePhase = { kind: "acceptance", claim: "untouched" } as const;

function passingAttempts(): RetainedAttempt[] {
	return prepareCurrentTestCases(developmentPhase).map((testCase, index) => ({
		caseId: testCase.id,
		input: testCase.input,
		idealOutput: testCase.idealOutput,
		output: testCase.idealOutput,
		...subordinatingConjunctionGrammaticalResolutionExperiment.evaluator({
			caseId: testCase.id,
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output: testCase.idealOutput,
		}),
		latencyMs: index,
		rawOutputText: JSON.stringify(testCase.idealOutput),
		resolvedModel: "provider-test-snapshot",
		responseId: `response-${index}`,
		usage: {},
		missClassification: null,
		missClassificationExplanation: null,
	}));
}

function draftResult() {
	const attempts = passingAttempts();
	return {
		...currentEvidenceBinding(developmentPhase),
		startedAt,
		completedAt,
		finalizedAt: null,
		boundedCalls: attempts.length,
		...summarizeEvidence(attempts, false),
		attempts,
	};
}

test("SCONJ runner preflights both suites without provider access", async () => {
	let clientFactoryCalls = 0;
	const checked = await preflight(developmentPhase, {
		createClient() {
			clientFactoryCalls += 1;
			throw new Error("Preflight must not create a provider client.");
		},
	});
	const binding = currentEvidenceBinding(developmentPhase);

	expect(clientFactoryCalls).toBe(0);
	expect(checked.boundedCalls).toBe(22);
	expect(prepareCurrentTestCases(developmentPhase)).toHaveLength(22);
	expect(prepareCurrentTestCases(acceptancePhase)).toHaveLength(15);
	expect(binding).toMatchObject({
		runnerVersion: "grammatical-resolution-subordinating-conjunction-v2",
		route: "grammatical-resolution/de/lexeme/subordinating-conjunction",
		transport: "openai-responses-direct-serial",
		model: "gpt-5.6-luna",
		reasoningEffort: "none",
		maxOutputTokens: 4096,
	});
	expect(() => assertEvaluationSuiteBounds(9)).toThrow(/at least 10/);
	expect(() => assertEvaluationSuiteBounds(26)).toThrow(/capped at 25/);
	expect(() => assertEvaluationSuiteBounds(10.5)).toThrow(/safe integer/);
});

test("SCONJ requests explicitly cache the stable prompt prefix", () => {
	const first = prepareCurrentTestCases(developmentPhase)[0];
	if (first === undefined)
		throw new Error("Expected a SCONJ development case.");
	const binding = currentEvidenceBinding(developmentPhase);
	const request = responseRequestFor(first.input);
	expect(SCONJ_PROMPT_CACHE_POLICY).toEqual({
		mode: "explicit",
		ttl: "30m",
		breakpoint: "end-of-stable-system-prompt",
	});
	expect(binding.promptCacheKey).toMatch(/^[0-9a-f]{64}$/u);
	expect(binding.suiteSha256).toMatch(/^[0-9a-f]{64}$/u);
	expect(request.prompt_cache_key).toBe(binding.promptCacheKey);
	expect(request).toMatchObject({
		prompt_cache_options: { mode: "explicit", ttl: "30m" },
		input: [
			{
				role: "system",
				content: [
					{
						type: "input_text",
						prompt_cache_breakpoint: { mode: "explicit" },
					},
				],
			},
			{ role: "user" },
		],
	});
});

test("SCONJ retained evidence is strict and current-bound", () => {
	const valid = parseRetainedRun(draftResult());
	expect(() => assertCurrentEvidenceBinding(valid)).not.toThrow();
	expect(() =>
		parseRetainedRun({ ...valid, contractScore: valid.contractScore - 1 }),
	).toThrow(/Retained evidence summary field/);
	expect(() =>
		parseRetainedRun({
			...valid,
			runnerVersion:
				"grammatical-resolution-subordinating-conjunction-v1",
		}),
	).toThrow();
	expect(() =>
		assertCurrentEvidenceBinding({
			...valid,
			outputSchemaSha256: "0".repeat(64),
		}),
	).toThrow(/obsolete evidence policy/);
});

test("SCONJ finalization is offline, atomic, and recomputed", async () => {
	const directory = await mkdtemp(join(tmpdir(), "sconj-runner-test-"));
	const resultsPath = join(directory, "results.json");
	const classificationsPath = join(directory, "miss-classifications.json");
	try {
		const attempts = passingAttempts();
		const firstAttempt = attempts[0];
		if (firstAttempt === undefined) throw new Error("Expected an attempt.");
		attempts[0] = { ...firstAttempt, contractPass: false };
		const draft = {
			...currentEvidenceBinding(developmentPhase),
			startedAt,
			completedAt,
			finalizedAt: null,
			boundedCalls: attempts.length,
			...summarizeEvidence(attempts, false),
			attempts,
		};
		await writeFile(resultsPath, JSON.stringify(draft), "utf8");
		await writeFile(classificationsPath, "{}", "utf8");

		const finalized = await finalizeEvidence(
			resultsPath,
			classificationsPath,
		);
		expect(finalized.completedAt).toBe(completedAt);
		expect(finalized.finalizedAt).not.toBeNull();
		expect(finalized.contractScore).toBe(finalized.boundedCalls);
		expect(finalized.evidenceThresholdMet).toBe(true);
		expect(
			parseRetainedRun(JSON.parse(await readFile(resultsPath, "utf8")))
				.finalizedAt,
		).toBe(finalized.finalizedAt);
		expect(
			finalizeEvidence(resultsPath, classificationsPath),
		).rejects.toThrow(/already been finalized/);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
