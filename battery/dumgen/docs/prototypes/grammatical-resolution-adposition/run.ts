// PROTOTYPE ONLY — bounded evaluation configuration for German Lexeme/ADP.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import {
	createDirectCachedEvaluationRunner,
	DIRECT_CACHED_PROMPT_POLICY,
} from "../../../src/promptsmith/laboratory/experiments/direct-cached-evaluation-runner";
import {
	adpositionGrammaticalResolutionAcceptanceExperiment,
	adpositionGrammaticalResolutionExperiment,
} from "../../../src/promptsmith/laboratory/experiments/grammatical-resolution-adposition/evaluation-suite";

const HERE = dirname(fileURLToPath(import.meta.url));

export const ADP_PROMPT_CACHE_POLICY = DIRECT_CACHED_PROMPT_POLICY;

export const adpositionEvaluationRunner = createDirectCachedEvaluationRunner({
	runnerVersion: "grammatical-resolution-adposition-v4",
	route: "grammatical-resolution/de/lexeme/adposition",
	structuredOutputName: "grammatical_resolution_adposition",
	experiments: {
		development: adpositionGrammaticalResolutionExperiment,
		acceptance: adpositionGrammaticalResolutionAcceptanceExperiment,
	},
	diagnosticShape: {
		contractPass: z.boolean(),
		memberCountPass: z.boolean(),
		memberOrthographiesPass: z.boolean(),
		normalizedSurfacePass: z.boolean(),
		spellingPass: z.boolean(),
		surfaceFeaturesPass: z.boolean(),
		canonicalFormPass: z.boolean(),
		coreFeaturesPass: z.boolean(),
	},
	limits: {
		maxOutputTokens: 4096,
		minimumEvaluationCases: 10,
		maximumEvaluationCases: 30,
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
} = adpositionEvaluationRunner;

export type RetainedRun = ReturnType<typeof parseRetainedRun>;
export type RetainedAttempt = RetainedRun["attempts"][number];

if (import.meta.main) {
	await adpositionEvaluationRunner.runCli(process.argv.slice(2));
}
