// PROTOTYPE ONLY — bounded evaluation configuration for German Construction/Fusion.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import {
	createDirectCachedEvaluationRunner,
	DIRECT_CACHED_PROMPT_POLICY,
} from "../../../src/promptsmith/laboratory/experiments/direct-cached-evaluation-runner";
import {
	fusionGrammaticalResolutionAcceptanceExperiment,
	fusionGrammaticalResolutionExperiment,
} from "../../../src/promptsmith/laboratory/experiments/grammatical-resolution-fusion/evaluation-suite";

const HERE = dirname(fileURLToPath(import.meta.url));

export const FUSION_PROMPT_CACHE_POLICY = DIRECT_CACHED_PROMPT_POLICY;

export const fusionEvaluationRunner = createDirectCachedEvaluationRunner({
	runnerVersion: "grammatical-resolution-fusion-v6",
	route: "grammatical-resolution/de/construction/fusion",
	structuredOutputName: "grammatical_resolution_fusion",
	experiments: {
		development: fusionGrammaticalResolutionExperiment,
		acceptance: fusionGrammaticalResolutionAcceptanceExperiment,
	},
	diagnosticShape: {
		contractPass: z.boolean(),
		memberCountPass: z.boolean(),
		memberOrthographiesPass: z.boolean(),
		normalizedSurfacePass: z.boolean(),
		spellingPass: z.boolean(),
		surfaceFeaturesPass: z.boolean(),
		canonicalFormPass: z.boolean(),
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
} = fusionEvaluationRunner;

export type RetainedRun = ReturnType<typeof parseRetainedRun>;
export type RetainedAttempt = RetainedRun["attempts"][number];

if (import.meta.main) {
	await fusionEvaluationRunner.runCli(process.argv.slice(2));
}
