// PROTOTYPE ONLY — bounded evaluation configuration for German Phraseme/Aphorism.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import {
	createDirectCachedEvaluationRunner,
	DIRECT_CACHED_PROMPT_POLICY,
} from "../../../src/promptsmith/laboratory/experiments/direct-cached-evaluation-runner";
import {
	aphorismGrammaticalResolutionAcceptanceExperiment,
	aphorismGrammaticalResolutionExperiment,
} from "../../../src/promptsmith/laboratory/experiments/grammatical-resolution-aphorism/evaluation-suite";

const HERE = dirname(fileURLToPath(import.meta.url));

export const APHORISM_PROMPT_CACHE_POLICY = DIRECT_CACHED_PROMPT_POLICY;

export const aphorismEvaluationRunner = createDirectCachedEvaluationRunner({
	runnerVersion: "grammatical-resolution-aphorism-v8",
	route: "grammatical-resolution/de/phraseme/aphorism",
	structuredOutputName: "grammatical_resolution_aphorism",
	experiments: {
		development: aphorismGrammaticalResolutionExperiment,
		acceptance: aphorismGrammaticalResolutionAcceptanceExperiment,
	},
	diagnosticShape: {
		contractPass: z.boolean(),
		memberCountPass: z.boolean(),
		memberOrthographiesPass: z.boolean(),
		normalizedSurfacePass: z.boolean(),
		spellingPass: z.boolean(),
		realizationCoveragePass: z.boolean(),
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
} = aphorismEvaluationRunner;

export type RetainedRun = ReturnType<typeof parseRetainedRun>;
export type RetainedAttempt = RetainedRun["attempts"][number];

if (import.meta.main) {
	await aphorismEvaluationRunner.runCli(process.argv.slice(2));
}
