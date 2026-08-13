import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	assertCurrentEvidenceBinding,
	assertEvaluationSuiteBounds,
	currentEvidenceBinding,
	finalizeEvidence,
	PROVERB_PROMPT_CACHE_POLICY,
	parseRetainedRun,
	preflight,
	prepareCurrentTestCases,
	type RetainedAttempt,
	responseRequestFor,
	summarizeEvidence,
} from "../../docs/prototypes/grammatical-resolution-proverb/run";
import { proverbGrammaticalResolutionExperiment } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-proverb/evaluation-suite";

const developmentPhase = { kind: "development", round: 1 } as const;
const acceptancePhase = { kind: "acceptance", claim: "untouched" } as const;
const startedAt = "2020-01-01T10:00:00.000Z";
const completedAt = "2020-01-01T10:01:00.000Z";

function passingAttempts(): RetainedAttempt[] {
	return prepareCurrentTestCases(developmentPhase).map((testCase, index) => ({
		caseId: testCase.id,
		input: testCase.input,
		idealOutput: testCase.idealOutput,
		output: testCase.idealOutput,
		...proverbGrammaticalResolutionExperiment.evaluator({
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

test("Proverb shared-runner preflight is offline and phase-bound", async () => {
	let clientFactoryCalls = 0;
	const checked = await preflight(developmentPhase, {
		createClient() {
			clientFactoryCalls += 1;
			throw new Error("Preflight must not create a provider client.");
		},
	});
	expect(clientFactoryCalls).toBe(0);
	expect(checked.boundedCalls).toBe(18);
	expect(prepareCurrentTestCases(developmentPhase)).toHaveLength(18);
	expect(prepareCurrentTestCases(acceptancePhase)).toHaveLength(10);
	expect(currentEvidenceBinding(developmentPhase)).toMatchObject({
		runnerVersion: "grammatical-resolution-proverb-v6",
		route: "grammatical-resolution/de/phraseme/proverb",
		transport: "openai-responses-direct-serial",
		model: "gpt-5.6-luna",
		reasoningEffort: "none",
		maxOutputTokens: 4096,
	});
	expect(() => assertEvaluationSuiteBounds(9)).toThrow(/at least 10/);
	expect(() => assertEvaluationSuiteBounds(21)).toThrow(/capped at 20/);
});

test("Proverb requests use the shared explicit stable-prefix cache", () => {
	const first = prepareCurrentTestCases(developmentPhase)[0];
	if (first === undefined) throw new Error("Missing development case.");
	const request = responseRequestFor(first.input);
	expect(PROVERB_PROMPT_CACHE_POLICY).toEqual({
		mode: "explicit",
		ttl: "30m",
		breakpoint: "end-of-stable-system-prompt",
	});
	expect(request.prompt_cache_key).toBe(
		currentEvidenceBinding(developmentPhase).promptCacheKey,
	);
	expect(request).toMatchObject({
		store: false,
		max_output_tokens: 4096,
		prompt_cache_options: { mode: "explicit", ttl: "30m" },
	});
});

test("Proverb retained evidence is strict and current-bound", () => {
	const valid = parseRetainedRun(draftResult());
	expect(() => assertCurrentEvidenceBinding(valid)).not.toThrow();
	expect(() => parseRetainedRun({ ...valid, contractScore: 0 })).toThrow(
		/summary field/,
	);
	expect(() =>
		parseRetainedRun({ ...valid, runnerVersion: "obsolete" }),
	).toThrow();
	expect(() =>
		assertCurrentEvidenceBinding({ ...valid, suiteSha256: "0".repeat(64) }),
	).toThrow(/obsolete evidence policy/);
});

test("Proverb finalization is offline, atomic, and recomputed", async () => {
	const directory = await mkdtemp(join(tmpdir(), "proverb-runner-test-"));
	const resultsPath = join(directory, "results.json");
	const classificationsPath = join(directory, "miss-classifications.json");
	try {
		const attempts = passingAttempts();
		const first = attempts[0];
		if (first === undefined) throw new Error("Missing attempt.");
		attempts[0] = { ...first, contractPass: false };
		await writeFile(
			resultsPath,
			JSON.stringify({
				...currentEvidenceBinding(developmentPhase),
				startedAt,
				completedAt,
				finalizedAt: null,
				boundedCalls: attempts.length,
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
		expect(finalized.contractScore).toBe(18);
		expect(finalized.evidenceThresholdMet).toBe(true);
		expect(
			parseRetainedRun(JSON.parse(await readFile(resultsPath, "utf8")))
				.finalizedAt,
		).not.toBeNull();
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
