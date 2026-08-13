import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	assertCurrentEvidenceBinding,
	assertEvaluationSuiteBounds,
	currentEvidenceBinding,
	finalizeEvidence,
	NOUN_PROMPT_CACHE_POLICY,
	parseRetainedRun,
	preflight,
	prepareCurrentTestCases,
	type RetainedAttempt,
	responseRequestFor,
	summarizeEvidence,
} from "../../docs/prototypes/grammatical-resolution-noun/run";
import { nounGrammaticalResolutionExperiment } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-noun/evaluation-suite";

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
		...nounGrammaticalResolutionExperiment.evaluator({
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

test("NOUN runner import and preflight make no provider call", async () => {
	let clientFactoryCalls = 0;
	const checked = await preflight(developmentPhase, {
		createClient() {
			clientFactoryCalls += 1;
			throw new Error("Preflight must not create a provider client.");
		},
	});
	const binding = currentEvidenceBinding(developmentPhase);
	expect(clientFactoryCalls).toBe(0);
	expect(checked.boundedCalls).toBe(21);
	expect(binding.runnerVersion).toBe("grammatical-resolution-noun-v5");
	expect(binding.route).toBe("grammatical-resolution/de/lexeme/noun");
	expect(binding.transport).toBe("openai-responses-direct-serial");
	expect(binding.model).toBe("gpt-5.6-luna");
	expect(binding.reasoningEffort).toBe("none");
	expect(binding.maxOutputTokens).toBe(4096);
	expect(prepareCurrentTestCases(developmentPhase)).toHaveLength(21);
	expect(prepareCurrentTestCases(acceptancePhase)).toHaveLength(13);
	expect(() => assertEvaluationSuiteBounds(9)).toThrow(/at least 10/);
	expect(() => assertEvaluationSuiteBounds(31)).toThrow(/capped at 30/);
	expect(() => assertEvaluationSuiteBounds(15.5)).toThrow(/safe integer/);
	expect(() => assertEvaluationSuiteBounds(10)).not.toThrow();
	expect(() => assertEvaluationSuiteBounds(30)).not.toThrow();
});

test("NOUN requests cache the stable prompt prefix explicitly", () => {
	const testCases = prepareCurrentTestCases(developmentPhase);
	const first = testCases[0];
	const second = testCases[1];
	if (first === undefined || second === undefined) {
		throw new Error("Expected at least two NOUN evaluation cases.");
	}
	const binding = currentEvidenceBinding(developmentPhase);
	const firstRequest = responseRequestFor(first.input);
	const secondRequest = responseRequestFor(second.input);

	expect(NOUN_PROMPT_CACHE_POLICY).toEqual({
		mode: "explicit",
		ttl: "30m",
		breakpoint: "end-of-stable-system-prompt",
	});
	expect(binding.promptCacheKey).toMatch(/^[0-9a-f]{64}$/u);
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

test("NOUN retained evidence is strict and current-bound", () => {
	const valid = parseRetainedRun(draftResult());
	expect(() => assertCurrentEvidenceBinding(valid)).not.toThrow();
	expect(() =>
		parseRetainedRun({ ...valid, contractScore: valid.contractScore - 1 }),
	).toThrow(/Retained evidence summary field/);
	expect(() =>
		parseRetainedRun({
			...valid,
			runnerVersion: "grammatical-resolution-noun-v4",
		}),
	).toThrow();
	expect(() =>
		assertCurrentEvidenceBinding({
			...valid,
			outputSchemaSha256: "0".repeat(64),
		}),
	).toThrow(/obsolete evidence policy/);

	const first = valid.attempts[0];
	if (first === undefined) throw new Error("Expected an attempt.");
	const { output: _output, ...withoutOutput } = first;
	const parseFailure = {
		...withoutOutput,
		memberCountPass: false,
		memberOrthographiesPass: false,
		surfaceKindPass: false,
		normalizedSurfacePass: false,
		spellingPass: false,
		surfaceFeaturesPass: false,
		inflectionalFeaturesPass: false,
		canonicalFormPass: false,
		coreFeaturesPass: false,
		error: { name: "SyntaxError", message: "invalid provider JSON" },
		contractPass: false,
	};
	const retained = parseRetainedRun({
		...valid,
		attempts: [parseFailure, ...valid.attempts.slice(1)],
		contractScore: valid.contractScore - 1,
		scoreRatio: (valid.contractScore - 1) / valid.boundedCalls,
		executionErrorCount: 1,
	});
	expect(retained.attempts[0]?.error).toEqual({
		name: "SyntaxError",
		message: "invalid provider JSON",
	});
	expect(retained.attempts[0]?.rawOutputText).toBe(first.rawOutputText);
});

test("NOUN finalization is offline, atomic, and recomputed", async () => {
	const directory = await mkdtemp(join(tmpdir(), "noun-runner-test-"));
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
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
