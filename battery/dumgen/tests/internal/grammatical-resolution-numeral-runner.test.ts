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
} from "../../docs/prototypes/grammatical-resolution-numeral/run";
import { numeralGrammaticalResolutionExperiment } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-numeral/evaluation-suite";

const startedAt = "2020-01-01T10:00:00.000Z";
const completedAt = "2020-01-01T10:01:00.000Z";

function passingAttempts(): RetainedAttempt[] {
	return prepareCurrentTestCases().map((testCase, index) => ({
		caseId: testCase.id,
		input: testCase.input,
		idealOutput: testCase.idealOutput,
		output: testCase.idealOutput,
		...numeralGrammaticalResolutionExperiment.evaluator({
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

test("NUM runner import and preflight make no provider call", () => {
	expect(prepareCurrentTestCases()).toHaveLength(15);
	expect(() => assertEvaluationSuiteBounds(14)).toThrow(/at least 15/);
	expect(() => assertEvaluationSuiteBounds(26)).toThrow(/capped at 25/);
	expect(() => assertEvaluationSuiteBounds(15.5)).toThrow(/safe integer/);
	expect(() => assertEvaluationSuiteBounds(15)).not.toThrow();
	expect(() => assertEvaluationSuiteBounds(25)).not.toThrow();
});

test("NUM retained evidence is strict and current-bound", () => {
	const valid = parseRetainedRun(draftResult());
	expect(() => assertCurrentEvidenceBinding(valid)).not.toThrow();
	expect(() =>
		parseRetainedRun({ ...valid, promptSha256: "not-a-hash" }),
	).toThrow();
	expect(() =>
		parseRetainedRun({ ...valid, contractScore: valid.contractScore - 1 }),
	).toThrow(/summary field/);
	expect(() =>
		parseRetainedRun({
			...valid,
			completedAt: "2020-01-01T09:59:00.000Z",
		}),
	).toThrow(/completedAt/);
	expect(() =>
		parseRetainedRun({ ...valid, model: "obsolete-model" }),
	).toThrow();
	expect(() =>
		parseRetainedRun({
			...valid,
			registrationMaxOutputTokens: 2_048,
		}),
	).toThrow();
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

test("NUM retained evidence preserves complete metadata for parse failures", () => {
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
		inflectionalFeaturesPass: false,
		canonicalFormPass: false,
		coreFeaturesPass: false,
		rawOutputText: '{"decision":"Resolved","resolution":',
		error: { name: "SyntaxError", message: "Unexpected end of JSON input" },
	};
	const parseFailureAttempts = [parseFailure, ...valid.attempts.slice(1)];
	const retained = parseRetainedRun({
		...valid,
		...summarizeEvidence(parseFailureAttempts, false),
		attempts: parseFailureAttempts,
	});
	expect(retained.attempts[0]?.rawOutputText).toBe(
		'{"decision":"Resolved","resolution":',
	);
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

	const schemaFailure = {
		...parseFailure,
		rawOutputText: '{"decision":"Resolved","resolution":null}',
		error: {
			name: "ZodError",
			message: "Resolved output failed the exact schema.",
		},
	};
	const schemaFailureAttempts = [schemaFailure, ...valid.attempts.slice(1)];
	const schemaFailureRun = parseRetainedRun({
		...valid,
		...summarizeEvidence(schemaFailureAttempts, false),
		attempts: schemaFailureAttempts,
	});
	expect(() => JSON.parse(schemaFailure.rawOutputText)).not.toThrow();
	expect(schemaFailureRun.attempts[0]?.rawOutputText).toBe(
		schemaFailure.rawOutputText,
	);
	expect(schemaFailureRun.attempts[0]?.error?.name).toBe("ZodError");
});

test("NUM finalization is offline, atomic, and recomputed", async () => {
	const directory = await mkdtemp(join(tmpdir(), "num-runner-test-"));
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
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
