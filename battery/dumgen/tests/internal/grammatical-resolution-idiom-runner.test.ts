import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type OpenAI from "openai";

import {
	assertCurrentEvidenceBinding,
	assertEvaluationSuiteBounds,
	currentEvidenceBinding,
	finalizeEvidence,
	parseRetainedRun,
	prepareCurrentTestCases,
	type RetainedAttempt,
	runLiveEvaluation,
	summarizeEvidence,
} from "../../docs/prototypes/grammatical-resolution-idiom/run";
import { idiomGrammaticalResolutionExperiment } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-idiom/evaluation-suite";

const startedAt = "2020-01-01T10:00:00.000Z";
const completedAt = "2020-01-01T10:01:00.000Z";

function passingAttempts(): RetainedAttempt[] {
	return prepareCurrentTestCases().map((testCase, index) => ({
		caseId: testCase.id,
		input: testCase.input,
		idealOutput: testCase.idealOutput,
		output: testCase.idealOutput,
		...idiomGrammaticalResolutionExperiment.evaluator({
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
		...currentEvidenceBinding(),
		startedAt,
		completedAt,
		finalizedAt: null,
		boundedCalls: attempts.length,
		...summarizeEvidence(attempts, false),
		attempts,
	};
}

test("Idiom runner import and preflight make no provider call", async () => {
	const binding = currentEvidenceBinding();
	expect(binding.runnerVersion).toBe("grammatical-resolution-idiom-v1");
	expect(binding.route).toBe("grammatical-resolution/de/phraseme/idiom");
	expect(binding.model).toBe("gpt-5.6-luna");
	expect(binding.reasoningEffort).toBe("none");
	expect(binding.maxOutputTokens).toBe(16384);
	expect(prepareCurrentTestCases()).toHaveLength(20);
	expect(() => assertEvaluationSuiteBounds(14)).toThrow(/at least 15/);
	expect(() => assertEvaluationSuiteBounds(21)).toThrow(/capped at 20/);
	expect(() => assertEvaluationSuiteBounds(15.5)).toThrow(/safe integer/);
	expect(() => assertEvaluationSuiteBounds(15)).not.toThrow();
	expect(() => assertEvaluationSuiteBounds(20)).not.toThrow();
	let clientConstructions = 0;
	await expect(
		runLiveEvaluation({
			apiKey: "",
			createClient: () => {
				clientConstructions += 1;
				return null as unknown as OpenAI;
			},
		}),
	).rejects.toThrow(/OPENAI_API_KEY/);
	expect(clientConstructions).toBe(0);
});

test("Idiom retained evidence is strict and current-bound", () => {
	const valid = parseRetainedRun(draftResult());
	expect(() => assertCurrentEvidenceBinding(valid)).not.toThrow();
	expect(() =>
		parseRetainedRun({ ...valid, contractScore: valid.contractScore - 1 }),
	).toThrow(/summary field/);
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

test("Idiom finalization reparses raw output and writes recomputed evidence", async () => {
	const directory = await mkdtemp(join(tmpdir(), "idiom-runner-test-"));
	const resultsPath = join(directory, "results.json");
	const classificationsPath = join(directory, "miss-classifications.json");
	try {
		const draft = draftResult();
		const firstAttempt = draft.attempts[0];
		if (firstAttempt === undefined) throw new Error("Expected an attempt.");
		await writeFile(classificationsPath, "{}", "utf8");
		await writeFile(
			resultsPath,
			JSON.stringify({
				...draft,
				attempts: [
					{
						...firstAttempt,
						rawOutputText: JSON.stringify({
							decision: "Unresolved",
							resolution: null,
						}),
					},
					...draft.attempts.slice(1),
				],
			}),
			"utf8",
		);
		expect(
			finalizeEvidence(resultsPath, classificationsPath),
		).rejects.toThrow(/raw output does not exactly match/);

		await writeFile(resultsPath, JSON.stringify(draft), "utf8");
		const finalized = await finalizeEvidence(
			resultsPath,
			classificationsPath,
		);
		expect(finalized.finalizedAt).not.toBeNull();
		expect(finalized.contractScore).toBe(20);
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
