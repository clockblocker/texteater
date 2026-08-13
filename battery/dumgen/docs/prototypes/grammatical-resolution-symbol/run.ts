// PROTOTYPE ONLY — bounded evaluation configuration for German Lexeme/SYM.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import {
	createDirectCachedEvaluationRunner,
	DIRECT_CACHED_PROMPT_POLICY,
} from "../../../src/promptsmith/laboratory/experiments/direct-cached-evaluation-runner";
import {
	symbolGrammaticalResolutionAcceptanceExperiment,
	symbolGrammaticalResolutionExperiment,
} from "../../../src/promptsmith/laboratory/experiments/grammatical-resolution-symbol/evaluation-suite";

const HERE = dirname(fileURLToPath(import.meta.url));

export const SYM_PROMPT_CACHE_POLICY = DIRECT_CACHED_PROMPT_POLICY;

export const symbolEvaluationRunner = createDirectCachedEvaluationRunner({
	runnerVersion: "grammatical-resolution-symbol-v2",
	route: "grammatical-resolution/de/lexeme/symbol",
	structuredOutputName: "grammatical_resolution_symbol",
	experiments: {
		development: symbolGrammaticalResolutionExperiment,
		acceptance: symbolGrammaticalResolutionAcceptanceExperiment,
	},
	diagnosticShape: {
		contractPass: z.boolean(),
		memberCountPass: z.boolean(),
		memberOrthographiesPass: z.boolean(),
		surfaceKindPass: z.boolean(),
		normalizedSurfacePass: z.boolean(),
		spellingPass: z.boolean(),
		surfaceFeaturesPass: z.boolean(),
		inflectionalFeaturesPass: z.boolean(),
		canonicalFormPass: z.boolean(),
		coreFeaturesPass: z.boolean(),
	},
	limits: {
		maxOutputTokens: 4096,
		minimumEvaluationCases: 10,
		maximumEvaluationCases: 25,
		minimumScoreRatio: 0.8,
	},
	evidence: {
		runsDirectory: join(HERE, "runs"),
		acceptanceReservationPath: join(
			HERE,
			"runs",
			"acceptance-reservation.json",
		),
	},
});

export const {
	assertCurrentEvidenceBinding,
	assertEvaluationSuiteBounds,
	evidenceBinding: currentEvidenceBinding,
	finalizeEvidence,
	parseRetainedRun,
	preflight,
	prepareTestCases: prepareCurrentTestCases,
	responseRequestFor,
	runLiveEvaluation,
	summarizeEvidence,
} = symbolEvaluationRunner;

export type RetainedRun = ReturnType<typeof parseRetainedRun>;
export type RetainedAttempt = RetainedRun["attempts"][number];

if (import.meta.main) {
	await symbolEvaluationRunner.runCli(process.argv.slice(2));
}
