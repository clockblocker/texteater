import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type OpenAI from "openai";
import {
	assertCurrentEvidenceBinding,
	assertEvaluationSuiteBounds,
	BATCH_EVIDENCE_TRANSPORT,
	currentEvidenceBinding,
	finalizeEvidence,
	parseRetainedRun,
	prepareCurrentTestCases,
	type RetainedAttempt,
	runLiveEvaluation,
	summarizeEvidence,
} from "../../docs/prototypes/grammatical-resolution-fusion/run";
import {
	DUMGEN_GENERATION_MODEL,
	DUMGEN_REASONING_EFFORT,
} from "../../src/ai-sdk/model-policy";
import { fusionGrammaticalResolutionExperiment } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-fusion/evaluation-suite";

const startedAt = "2020-01-01T10:00:00.000Z";
const completedAt = "2020-01-01T10:01:00.000Z";

function passingAttempts(): RetainedAttempt[] {
	return prepareCurrentTestCases().map((testCase, index) => ({
		caseId: testCase.id,
		input: testCase.input,
		idealOutput: testCase.idealOutput,
		output: testCase.idealOutput,
		...fusionGrammaticalResolutionExperiment.evaluator({
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

test("Fusion Batch evidence has strict provenance and honest timing", () => {
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

test("Fusion finalizes Batch evidence without changing transport", async () => {
	const directory = await mkdtemp(join(tmpdir(), "fusion-batch-test-"));
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

test("Fusion runner import and preflight make no provider call", async () => {
	expect(currentEvidenceBinding().route).toBe(
		"grammatical-resolution/de/construction/fusion",
	);
	expect(currentEvidenceBinding().runnerVersion).toBe(
		"grammatical-resolution-fusion-v2",
	);
	expect(currentEvidenceBinding().model).toBe(DUMGEN_GENERATION_MODEL);
	expect(currentEvidenceBinding().reasoningEffort).toBe(
		DUMGEN_REASONING_EFFORT,
	);
	expect(currentEvidenceBinding().runMaxOutputTokens).toBe(16384);
	expect(prepareCurrentTestCases()).toHaveLength(20);
	expect(() => assertEvaluationSuiteBounds(14)).toThrow(/at least 15/);
	expect(() => assertEvaluationSuiteBounds(26)).toThrow(/capped at 25/);
	expect(() => assertEvaluationSuiteBounds(15.5)).toThrow(/safe integer/);
	expect(() => assertEvaluationSuiteBounds(15)).not.toThrow();
	expect(() => assertEvaluationSuiteBounds(25)).not.toThrow();
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

test("Fusion retained evidence is strict and current-bound", () => {
	const valid = parseRetainedRun(draftResult());
	expect(() => assertCurrentEvidenceBinding(valid)).not.toThrow();
	expect(() =>
		parseRetainedRun({ ...valid, promptSha256: "not-a-hash" }),
	).toThrow();
	expect(() =>
		parseRetainedRun({ ...valid, contractScore: valid.contractScore - 1 }),
	).toThrow(/summary field/);
	expect(() =>
		assertCurrentEvidenceBinding({
			...valid,
			outputSchemaSha256: "0".repeat(64),
		}),
	).toThrow(/obsolete evidence policy/);
});

test("Fusion finalization rejects a parsed output that differs from retained raw output", async () => {
	const directory = await mkdtemp(join(tmpdir(), "fusion-tamper-test-"));
	const resultsPath = join(directory, "results.json");
	const classificationsPath = join(directory, "miss-classifications.json");
	try {
		const currentDraft = draftResult();
		const firstAttempt = currentDraft.attempts[0];
		if (firstAttempt === undefined)
			throw new Error("Expected a current case.");
		const attempts = [
			{
				...firstAttempt,
				rawOutputText: JSON.stringify({
					decision: "Unresolved",
					resolution: null,
				}),
			},
			...currentDraft.attempts.slice(1),
		];
		await writeFile(
			resultsPath,
			JSON.stringify({
				...currentDraft,
				...summarizeEvidence(attempts, false),
				attempts,
			}),
			"utf8",
		);
		await writeFile(classificationsPath, "{}", "utf8");
		await expect(
			finalizeEvidence(resultsPath, classificationsPath),
		).rejects.toThrow(/does not match its raw provider output/);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("Fusion retains complete provider metadata for parse failures", () => {
	const valid = parseRetainedRun(draftResult());
	const firstAttempt = valid.attempts[0];
	if (firstAttempt === undefined) throw new Error("Expected a current case.");
	const { output: _output, ...withoutOutput } = firstAttempt;
	const parseFailure = {
		...withoutOutput,
		contractPass: false,
		decisionPass: false,
		decisionResolutionCoherencePass: false,
		memberCountPass: false,
		memberOrthographiesPass: false,
		surfaceKindPass: false,
		normalizedSurfacePass: false,
		spellingPass: false,
		realizationCoveragePass: false,
		surfaceFeaturesPass: false,
		canonicalFormPass: false,
		coreFeaturesPass: false,
		rawOutputText: '{"decision":"Resolved","resolution":',
		error: { name: "SyntaxError", message: "Unexpected end of JSON input" },
	};
	const attempts = [parseFailure, ...valid.attempts.slice(1)];
	const retained = parseRetainedRun({
		...valid,
		...summarizeEvidence(attempts, false),
		attempts,
	});
	expect(retained.attempts[0]?.responseId).toBe(firstAttempt.responseId);
	const { rawOutputText: _rawOutputText, ...incompleteMetadata } =
		parseFailure;
	const incompleteAttempts = [incompleteMetadata, ...valid.attempts.slice(1)];
	expect(() =>
		parseRetainedRun({
			...valid,
			...summarizeEvidence(incompleteAttempts, false),
			attempts: incompleteAttempts,
		}),
	).toThrow(/metadata must be retained completely/);
});

test("Fusion finalization is offline, atomic, and recomputed", async () => {
	const directory = await mkdtemp(join(tmpdir(), "fusion-runner-test-"));
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
		await writeFile(
			resultsPath,
			JSON.stringify({
				...currentDraft,
				...summarizeEvidence(attempts, false),
				attempts,
			}),
			"utf8",
		);
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
