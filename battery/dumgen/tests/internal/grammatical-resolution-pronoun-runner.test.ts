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
	prepareCurrentTestCases,
	type RetainedAttempt,
	summarizeEvidence,
} from "../../docs/prototypes/grammatical-resolution-pronoun/run";
import { pronounGrammaticalResolutionExperiment } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-pronoun/evaluation-suite";

const startedAt = "2020-01-01T10:00:00.000Z";
const completedAt = "2020-01-01T10:01:00.000Z";

function passingAttempts(): RetainedAttempt[] {
	return prepareCurrentTestCases().map((testCase, index) => ({
		caseId: testCase.id,
		input: testCase.input,
		idealOutput: testCase.idealOutput,
		output: testCase.idealOutput,
		...pronounGrammaticalResolutionExperiment.evaluator({
			caseId: testCase.id,
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output: testCase.idealOutput,
		}),
		latencyMs: index,
		rawOutputText: JSON.stringify(testCase.idealOutput),
		resolvedModel: "gpt-5-nano-test-snapshot",
		responseId: `response-${index}`,
		usage: {},
		missClassification: null,
		missClassificationExplanation: null,
	}));
}

function draftResult() {
	const attempts = passingAttempts();
	return {
		...currentEvidenceBinding(),
		startedAt,
		completedAt,
		finalizedAt: null,
		boundedCalls: attempts.length,
		...summarizeEvidence(attempts, false),
		attempts,
	};
}

test("PRON runner import and preflight make no provider call", () => {
	const binding = currentEvidenceBinding();
	expect(binding.runnerVersion).toBe("grammatical-resolution-pronoun-v1");
	expect(binding.route).toBe("grammatical-resolution/de/lexeme/pronoun");
	expect(binding.model).toBe("gpt-5-nano");
	expect(binding.reasoningEffort).toBe("high");
	expect(binding.maxOutputTokens).toBe(16384);
	expect(prepareCurrentTestCases()).toHaveLength(21);
	expect(() => assertEvaluationSuiteBounds(14)).toThrow(/at least 15/);
	expect(() => assertEvaluationSuiteBounds(26)).toThrow(/capped at 25/);
	expect(() => assertEvaluationSuiteBounds(15.5)).toThrow(/safe integer/);
	expect(() => assertEvaluationSuiteBounds(15)).not.toThrow();
	expect(() => assertEvaluationSuiteBounds(25)).not.toThrow();
});

test("PRON retained evidence is strict, current-bound, and preserves errors", () => {
	const valid = parseRetainedRun(draftResult());
	expect(() => assertCurrentEvidenceBinding(valid)).not.toThrow();
	expect(() =>
		parseRetainedRun({
			...valid,
			runnerVersion: "grammatical-resolution-pronoun-v0",
		}),
	).toThrow();
	expect(() =>
		parseRetainedRun({ ...valid, promptSha256: "not-a-hash" }),
	).toThrow();
	expect(() =>
		parseRetainedRun({ ...valid, contractScore: valid.contractScore - 1 }),
	).toThrow(/summary field/);
	expect(() => parseRetainedRun({ ...valid, model: "gpt-5-mini" })).toThrow();
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
		decisionPass: false,
		decisionResolutionCoherencePass: false,
		memberCountPass: false,
		memberOrthographiesPass: false,
		surfaceKindPass: false,
		normalizedSurfacePass: false,
		spellingPass: false,
		realizationCoveragePass: false,
		surfaceFeaturesPass: false,
		inflectionalFeaturesPass: false,
		canonicalFormPass: false,
		coreFeaturesPass: false,
		error: { name: "SyntaxError", message: "invalid provider JSON" },
		contractPass: false,
	};
	const withError = {
		...valid,
		attempts: [parseFailure, ...valid.attempts.slice(1)],
		contractScore: valid.contractScore - 1,
		scoreRatio: (valid.contractScore - 1) / valid.boundedCalls,
		executionErrorCount: 1,
	};
	const retained = parseRetainedRun(withError);
	expect(retained.attempts[0]?.error).toEqual({
		name: "SyntaxError",
		message: "invalid provider JSON",
	});
	expect(retained.attempts[0]?.rawOutputText).toBe(first.rawOutputText);
	expect(retained.attempts[0]?.responseId).toBe(first.responseId);

	const { rawOutputText: _rawOutputText, ...incompleteMetadata } =
		parseFailure;
	expect(() =>
		parseRetainedRun({
			...valid,
			attempts: [incompleteMetadata, ...valid.attempts.slice(1)],
		}),
	).toThrow(/metadata must be retained completely/);
});

test("PRON finalization is offline, atomic, and recomputed", async () => {
	const directory = await mkdtemp(join(tmpdir(), "pron-runner-test-"));
	const resultsPath = join(directory, "results.json");
	const classificationsPath = join(directory, "miss-classifications.json");
	try {
		const currentDraft = draftResult();
		const attempts = currentDraft.attempts.map((attempt, index) =>
			index === 0
				? {
						...attempt,
						contractPass: false,
						normalizedSurfacePass: false,
					}
				: attempt,
		);
		const draft = {
			...currentDraft,
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
		await expect(
			finalizeEvidence(resultsPath, classificationsPath),
		).rejects.toThrow(/already been finalized/);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
