// PROTOTYPE ONLY — bounded evaluation configuration for German Phraseme/Idiom.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import {
	createDirectCachedEvaluationRunner,
	DIRECT_CACHED_PROMPT_POLICY,
} from "../../../src/promptsmith/laboratory/experiments/direct-cached-evaluation-runner";
import {
	idiomGrammaticalResolutionAcceptanceExperiment,
	idiomGrammaticalResolutionExperiment,
} from "../../../src/promptsmith/laboratory/experiments/grammatical-resolution-idiom/evaluation-suite";

const HERE = dirname(fileURLToPath(import.meta.url));

export const IDIOM_PROMPT_CACHE_POLICY = DIRECT_CACHED_PROMPT_POLICY;

export const idiomEvaluationRunner = createDirectCachedEvaluationRunner({
	runnerVersion: "grammatical-resolution-idiom-v3",
	route: "grammatical-resolution/de/phraseme/idiom",
	structuredOutputName: "grammatical_resolution_idiom",
	experiments: {
		development: idiomGrammaticalResolutionExperiment,
		acceptance: idiomGrammaticalResolutionAcceptanceExperiment,
	},
	diagnosticShape: {
		contractPass: z.boolean(),
		memberCountPass: z.boolean(),
		memberOrthographiesPass: z.boolean(),
		surfaceKindPass: z.boolean(),
		normalizedSurfacePass: z.boolean(),
		spellingPass: z.boolean(),
		realizationCoveragePass: z.boolean(),
		surfaceFeaturesPass: z.boolean(),
		inflectionalFeaturesPass: z.boolean(),
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
} = idiomEvaluationRunner;

export type RetainedRun = ReturnType<typeof parseRetainedRun>;
export type RetainedAttempt = RetainedRun["attempts"][number];

if (import.meta.main) {
	await idiomEvaluationRunner.runCli(process.argv.slice(2));
}
