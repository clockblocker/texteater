// PROTOTYPE ONLY — bounded evaluation configuration for German Lexeme/ADJ.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import {
	createDirectCachedEvaluationRunner,
	DIRECT_CACHED_PROMPT_POLICY,
} from "../../../src/promptsmith/laboratory/experiments/direct-cached-evaluation-runner";
import {
	adjectiveGrammaticalResolutionAcceptanceExperiment,
	adjectiveGrammaticalResolutionExperiment,
} from "../../../src/promptsmith/laboratory/experiments/grammatical-resolution-adjective/evaluation-suite";

const HERE = dirname(fileURLToPath(import.meta.url));

export const ADJ_PROMPT_CACHE_POLICY = DIRECT_CACHED_PROMPT_POLICY;

export const adjectiveEvaluationRunner = createDirectCachedEvaluationRunner({
	runnerVersion: "grammatical-resolution-adjective-v4",
	route: "grammatical-resolution/de/lexeme/adjective",
	structuredOutputName: "grammatical_resolution_adjective",
	experiments: {
		development: adjectiveGrammaticalResolutionExperiment,
		acceptance: adjectiveGrammaticalResolutionAcceptanceExperiment,
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
		maximumEvaluationCases: 20,
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
} = adjectiveEvaluationRunner;

export type RetainedRun = ReturnType<typeof parseRetainedRun>;
export type RetainedAttempt = RetainedRun["attempts"][number];

if (import.meta.main) {
	await adjectiveEvaluationRunner.runCli(process.argv.slice(2));
}
