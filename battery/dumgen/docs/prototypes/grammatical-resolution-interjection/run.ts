// PROTOTYPE ONLY — bounded evaluation configuration for German Lexeme/INTJ.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import {
	createDirectCachedEvaluationRunner,
	DIRECT_CACHED_PROMPT_POLICY,
} from "../../../src/promptsmith/laboratory/experiments/direct-cached-evaluation-runner";
import {
	interjectionGrammaticalResolutionAcceptanceExperiment,
	interjectionGrammaticalResolutionExperiment,
} from "../../../src/promptsmith/laboratory/experiments/grammatical-resolution-interjection/evaluation-suite";

const HERE = dirname(fileURLToPath(import.meta.url));

export const INTJ_PROMPT_CACHE_POLICY = DIRECT_CACHED_PROMPT_POLICY;

export const interjectionEvaluationRunner = createDirectCachedEvaluationRunner({
	runnerVersion: "grammatical-resolution-interjection-v2",
	route: "grammatical-resolution/de/lexeme/interjection",
	structuredOutputName: "grammatical_resolution_interjection",
	experiments: {
		development: interjectionGrammaticalResolutionExperiment,
		acceptance: interjectionGrammaticalResolutionAcceptanceExperiment,
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
} = interjectionEvaluationRunner;

export type RetainedRun = ReturnType<typeof parseRetainedRun>;
export type RetainedAttempt = RetainedRun["attempts"][number];

if (import.meta.main) {
	await interjectionEvaluationRunner.runCli(process.argv.slice(2));
}
