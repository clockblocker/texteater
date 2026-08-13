// PROTOTYPE ONLY — bounded evaluation configuration for German Lexeme/PROPN.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import {
	createDirectCachedEvaluationRunner,
	DIRECT_CACHED_PROMPT_POLICY,
} from "../../../src/promptsmith/laboratory/experiments/direct-cached-evaluation-runner";
import {
	properNounGrammaticalResolutionAcceptanceExperiment,
	properNounGrammaticalResolutionExperiment,
} from "../../../src/promptsmith/laboratory/experiments/grammatical-resolution-proper-noun/evaluation-suite";

const HERE = dirname(fileURLToPath(import.meta.url));

export const PROPN_PROMPT_CACHE_POLICY = DIRECT_CACHED_PROMPT_POLICY;

export const properNounEvaluationRunner = createDirectCachedEvaluationRunner({
	runnerVersion: "grammatical-resolution-proper-noun-v2",
	route: "grammatical-resolution/de/lexeme/proper-noun",
	structuredOutputName: "grammatical_resolution_proper_noun",
	experiments: {
		development: properNounGrammaticalResolutionExperiment,
		acceptance: properNounGrammaticalResolutionAcceptanceExperiment,
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
} = properNounEvaluationRunner;

export type RetainedRun = ReturnType<typeof parseRetainedRun>;
export type RetainedAttempt = RetainedRun["attempts"][number];

if (import.meta.main) {
	await properNounEvaluationRunner.runCli(process.argv.slice(2));
}
