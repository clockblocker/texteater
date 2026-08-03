import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	assertCurrentEvidenceBinding,
	assertEvaluationSuiteBounds,
	BATCH_EVIDENCE_TRANSPORT,
	currentEvidenceBinding,
	finalizeEvidence,
	parseRetainedRun,
	prepareCurrentTestCases,
	type RetainedAttempt,
	summarizeEvidence,
} from "../../docs/prototypes/grammatical-resolution-collocation/run";
import { collocationGrammaticalResolutionExperiment } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-collocation/evaluation-suite";

const startedAt = "2020-01-01T10:00:00.000Z";
const completedAt = "2020-01-01T10:01:00.000Z";

function passingAttempts(): RetainedAttempt[] {
	return prepareCurrentTestCases().map((testCase, index) => ({
		caseId: testCase.id,
		input: testCase.input,
		idealOutput: testCase.idealOutput,
		output: testCase.idealOutput,
		...collocationGrammaticalResolutionExperiment.evaluator({
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
		batchProvenance: null,
		startedAt,
		completedAt,
		finalizedAt: null,
		boundedCalls: attempts.length,
		...summarizeEvidence(attempts, false),
		attempts,
	};
}

function batchDraftResult() {
	const attempts = passingAttempts().map((attempt) => ({
		...attempt,
		latencyMs: null,
	}));
	return {
		...currentEvidenceBinding(BATCH_EVIDENCE_TRANSPORT),
		batchProvenance: {
			batchId: "batch-test",
			inputFileId: "file-input",
			outputFileId: "file-output",
			errorFileId: null,
			submissionManifestSha256: "a".repeat(64),
			inputJsonlSha256: "b".repeat(64),
			outputJsonlSha256: "c".repeat(64),
			errorJsonlSha256: null,
			endpoint: "/v1/responses" as const,
			completionWindow: "24h" as const,
			createdAt: startedAt,
			completedAt,
			requestCounts: { total: 100, completed: 100, failed: 0 },
		},
		startedAt,
		completedAt,
		finalizedAt: null,
		boundedCalls: attempts.length,
		...summarizeEvidence(attempts, false),
		attempts,
	};
}

test("COLLOCATION Batch evidence has strict provenance and honest timing", () => {
	const valid = parseRetainedRun(batchDraftResult());
	expect(valid.transport).toBe(BATCH_EVIDENCE_TRANSPORT);
	expect(valid.attempts.every(({ latencyMs }) => latencyMs === null)).toBe(
		true,
	);
	expect(() => assertCurrentEvidenceBinding(valid)).not.toThrow();
	expect(() =>
		parseRetainedRun({
			...valid,
			batchProvenance: {
				...valid.batchProvenance,
				submissionManifestSha256: "not-a-hash",
			},
		}),
	).toThrow();
	expect(() =>
		parseRetainedRun({
			...valid,
			attempts: valid.attempts.map((attempt, index) => ({
				...attempt,
				latencyMs: index,
			})),
		}),
	).toThrow(/Batch attempts require null latency/);
	expect(() =>
		parseRetainedRun({
			...draftResult(),
			batchProvenance: valid.batchProvenance,
		}),
	).toThrow(/direct transport requires null provenance/);
});

test("COLLOCATION finalizes Batch evidence without changing transport", async () => {
	const directory = await mkdtemp(join(tmpdir(), "collocation-batch-test-"));
	const resultsPath = join(directory, "results.json");
	const classificationsPath = join(directory, "miss-classifications.json");
	try {
		await writeFile(
			resultsPath,
			JSON.stringify(batchDraftResult()),
			"utf8",
		);
		await writeFile(classificationsPath, "{}", "utf8");
		const finalized = await finalizeEvidence(
			resultsPath,
			classificationsPath,
		);
		expect(finalized.transport).toBe(BATCH_EVIDENCE_TRANSPORT);
		expect(finalized.batchProvenance?.submissionManifestSha256).toBe(
			"a".repeat(64),
		);
		expect(
			finalized.attempts.every(({ latencyMs }) => latencyMs === null),
		).toBe(true);
		expect(finalized.evidenceThresholdMet).toBe(true);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("COLLOCATION runner import and preflight make no provider call", () => {
	const binding = currentEvidenceBinding();
	expect(binding.runnerVersion).toBe("grammatical-resolution-collocation-v3");
	expect(binding.route).toBe(
		"grammatical-resolution/de/phraseme/collocation",
	);
	expect(binding.model).toBe("gpt-5.6-luna");
	expect(binding.reasoningEffort).toBe("none");
	expect(binding.maxOutputTokens).toBe(32768);
	expect(prepareCurrentTestCases()).toHaveLength(20);
	expect(() => assertEvaluationSuiteBounds(14)).toThrow(/at least 15/);
	expect(() => assertEvaluationSuiteBounds(21)).toThrow(/capped at 20/);
	expect(() => assertEvaluationSuiteBounds(15.5)).toThrow(/safe integer/);
	expect(() => assertEvaluationSuiteBounds(15)).not.toThrow();
	expect(() => assertEvaluationSuiteBounds(20)).not.toThrow();
});

test("COLLOCATION retained evidence is strict, current-bound, and preserves errors", () => {
	const valid = parseRetainedRun(draftResult());
	expect(() => assertCurrentEvidenceBinding(valid)).not.toThrow();
	expect(() =>
		parseRetainedRun({ ...valid, contractScore: valid.contractScore - 1 }),
	).toThrow(/Retained evidence summary field/);
	expect(() =>
		parseRetainedRun({
			...valid,
			runnerVersion: "grammatical-resolution-collocation-v0",
		}),
	).toThrow();
	expect(() =>
		parseRetainedRun({ ...valid, promptSha256: "not-a-hash" }),
	).toThrow();
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

test("COLLOCATION finalization is offline, atomic, and recomputed", async () => {
	const directory = await mkdtemp(join(tmpdir(), "collocation-runner-test-"));
	const resultsPath = join(directory, "results.json");
	const classificationsPath = join(directory, "miss-classifications.json");
	try {
		const attempts = passingAttempts();
		const firstAttempt = attempts[0];
		if (firstAttempt === undefined) throw new Error("Expected an attempt.");
		attempts[0] = { ...firstAttempt, contractPass: false };
		const draft = {
			...currentEvidenceBinding(),
			batchProvenance: null,
			startedAt,
			completedAt,
			finalizedAt: null,
			boundedCalls: attempts.length,
			...summarizeEvidence(attempts, false),
			attempts,
		};
		await writeFile(resultsPath, JSON.stringify(draft), "utf8");
		await writeFile(classificationsPath, "{}", "utf8");

		const tamperedAttempt = {
			...attempts[0],
			rawOutputText: JSON.stringify({
				decision: "Unresolved",
				resolution: null,
			}),
		};
		await writeFile(
			resultsPath,
			JSON.stringify({
				...draft,
				attempts: [tamperedAttempt, ...attempts.slice(1)],
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
