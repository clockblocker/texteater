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
} from "../../docs/prototypes/grammatical-resolution-adverb/run";
import { adverbGrammaticalResolutionExperiment } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-adverb/evaluation-suite";

const startedAt = "2020-01-01T10:00:00.000Z";
const completedAt = "2020-01-01T10:01:00.000Z";

function passingAttempts(): RetainedAttempt[] {
	return prepareCurrentTestCases().map((testCase, index) => ({
		caseId: testCase.id,
		input: testCase.input,
		idealOutput: testCase.idealOutput,
		output: testCase.idealOutput,
		...adverbGrammaticalResolutionExperiment.evaluator({
			caseId: testCase.id,
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output: testCase.idealOutput,
		}),
		latencyMs: index,
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

test("ADV runner import and preflight make no provider call", () => {
	const binding = currentEvidenceBinding();
	expect(binding.runnerVersion).toBe("grammatical-resolution-adverb-v9");
	expect(binding.model).toBe("gpt-5-nano");
	expect(binding.reasoningEffort).toBe("low");
	expect(binding.runMaxOutputTokens).toBe(4096);
	expect(prepareCurrentTestCases()).toHaveLength(15);
	expect(() => assertEvaluationSuiteBounds(14)).toThrow(/at least 15/);
	expect(() => assertEvaluationSuiteBounds(16)).toThrow(/capped at 15/);
	expect(() => assertEvaluationSuiteBounds(15.5)).toThrow(/safe integer/);
	expect(() => assertEvaluationSuiteBounds(15)).not.toThrow();
});

test("ADV retained evidence is strict and current-bound", () => {
	const valid = parseRetainedRun(draftResult());
	expect(() => assertCurrentEvidenceBinding(valid)).not.toThrow();
	expect(() =>
		parseRetainedRun({ ...valid, promptSha256: "not-a-hash" }),
	).toThrow();
	expect(() =>
		parseRetainedRun({
			...valid,
			completedAt: "2020-01-01T09:59:00.000Z",
		}),
	).toThrow(/completedAt/);
	expect(() =>
		parseRetainedRun({
			...valid,
			runnerVersion: "grammatical-resolution-adverb-v8",
		}),
	).toThrow();
	expect(() => parseRetainedRun({ ...valid, model: "gpt-5-mini" })).toThrow();
	expect(() =>
		assertCurrentEvidenceBinding({
			...valid,
			outputSchemaSha256: "0".repeat(64),
		}),
	).toThrow(/obsolete evidence policy/);
	const firstAttempt = valid.attempts[0];
	if (firstAttempt === undefined) throw new Error("Expected a current case.");
	expect(() =>
		assertCurrentEvidenceBinding({
			...valid,
			attempts: [
				{
					...firstAttempt,
					idealOutput: {
						decision: "Unresolved" as const,
						resolution: null,
					},
				},
				...valid.attempts.slice(1),
			],
		}),
	).toThrow(/current Golden Case/);
});

test("ADV finalization is offline, atomic, and recomputed", async () => {
	const directory = await mkdtemp(join(tmpdir(), "adv-runner-test-"));
	const resultsPath = join(directory, "results.json");
	const classificationsPath = join(directory, "miss-classifications.json");
	try {
		const draft = {
			...draftResult(),
			contractScore: 0,
			scoreRatio: 0,
			meetsMinimumEvaluationCases: false,
			meetsMinimumScoreRatio: false,
			evidenceThresholdMet: false,
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
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
