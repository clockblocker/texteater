import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	assertCurrentEvidenceBinding,
	assertEvaluationSuiteBounds,
	CCONJ_PROMPT_CACHE_POLICY,
	currentEvidenceBinding,
	finalizeEvidence,
	parseRetainedRun,
	preflight,
	prepareCurrentTestCases,
	type RetainedAttempt,
	responseRequestFor,
	summarizeEvidence,
} from "../../docs/prototypes/grammatical-resolution-coordinating-conjunction/run";
import { coordinatingConjunctionGrammaticalResolutionExperiment } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-coordinating-conjunction/evaluation-suite";

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
		...coordinatingConjunctionGrammaticalResolutionExperiment.evaluator({
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

test("CCONJ runner preflights both frozen suites without provider access", async () => {
	let clientFactoryCalls = 0;
	const checked = await preflight(developmentPhase, {
		createClient() {
			clientFactoryCalls += 1;
			throw new Error("Preflight must not create a provider client.");
		},
	});
	const binding = currentEvidenceBinding(developmentPhase);

	expect(clientFactoryCalls).toBe(0);
	expect(checked.boundedCalls).toBe(18);
	expect(prepareCurrentTestCases(developmentPhase)).toHaveLength(18);
	expect(prepareCurrentTestCases(acceptancePhase)).toHaveLength(12);
	expect(binding).toMatchObject({
		runnerVersion: "grammatical-resolution-coordinating-conjunction-v3",
		route: "grammatical-resolution/de/lexeme/coordinating-conjunction",
		transport: "openai-responses-direct-serial",
		model: "gpt-5.6-luna",
		reasoningEffort: "none",
		maxOutputTokens: 4096,
	});
	expect(() => assertEvaluationSuiteBounds(9)).toThrow(/at least 10/);
	expect(() => assertEvaluationSuiteBounds(21)).toThrow(/capped at 20/);
	expect(() => assertEvaluationSuiteBounds(10.5)).toThrow(/safe integer/);
	expect(() => assertEvaluationSuiteBounds(10)).not.toThrow();
	expect(() => assertEvaluationSuiteBounds(20)).not.toThrow();
});

test("CCONJ requests cache the stable prompt prefix explicitly", () => {
	const testCases = prepareCurrentTestCases(developmentPhase);
	const first = testCases[0];
	const second = testCases[1];
	if (first === undefined || second === undefined) {
		throw new Error("Expected at least two CCONJ development cases.");
	}
	const binding = currentEvidenceBinding(developmentPhase);
	const firstRequest = responseRequestFor(first.input);
	const secondRequest = responseRequestFor(second.input);

	expect(CCONJ_PROMPT_CACHE_POLICY).toEqual({
		mode: "explicit",
		ttl: "30m",
		breakpoint: "end-of-stable-system-prompt",
	});
	expect(binding.promptCacheKey).toMatch(/^[0-9a-f]{64}$/u);
	expect(binding.suiteSha256).toMatch(/^[0-9a-f]{64}$/u);
	expect(firstRequest.prompt_cache_key).toBe(binding.promptCacheKey);
	expect(secondRequest.prompt_cache_key).toBe(binding.promptCacheKey);
	expect(firstRequest).toMatchObject({
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

test("CCONJ retained evidence is strict and current-bound", () => {
	const valid = parseRetainedRun(draftResult());
	expect(() => assertCurrentEvidenceBinding(valid)).not.toThrow();
	expect(() =>
		parseRetainedRun({ ...valid, contractScore: valid.contractScore - 1 }),
	).toThrow(/Retained evidence summary field/);
	expect(() =>
		parseRetainedRun({
			...valid,
			runnerVersion: "grammatical-resolution-coordinating-conjunction-v2",
		}),
	).toThrow();
	expect(() =>
		parseRetainedRun({ ...valid, promptSha256: "not-a-hash" }),
	).toThrow();
	expect(() =>
		assertCurrentEvidenceBinding({
			...valid,
			outputSchemaSha256: "0".repeat(64),
		}),
	).toThrow(/obsolete evidence policy/);
});

test("CCONJ finalization is offline, atomic, and recomputed", async () => {
	const directory = await mkdtemp(join(tmpdir(), "cconj-runner-test-"));
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
		expect(finalized.scoreRatio).toBe(1);
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
