// PROTOTYPE ONLY — bounded evaluation configuration for German Lexeme/VERB.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import {
	createDirectCachedEvaluationRunner,
	DIRECT_CACHED_PROMPT_POLICY,
} from "../../../src/promptsmith/laboratory/experiments/direct-cached-evaluation-runner";
import { verbGrammaticalResolutionExperiment } from "../../../src/promptsmith/laboratory/experiments/grammatical-resolution-verb/evaluation-suite";

const HERE = dirname(fileURLToPath(import.meta.url));

export const VERB_PROMPT_CACHE_POLICY = DIRECT_CACHED_PROMPT_POLICY;

export const verbEvaluationRunner = createDirectCachedEvaluationRunner({
	runnerVersion: "grammatical-resolution-verb-v5",
	route: "grammatical-resolution/de/lexeme/verb",
	structuredOutputName: "grammatical_resolution_verb",
	experiments: {
		development: verbGrammaticalResolutionExperiment,
		acceptance: {
			unavailableReason:
				"All existing non-development cases were inspected in legacy runs or are documented policy probes; a fresh disjoint corpus is required before an untouched claim.",
		},
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
		maxOutputTokens: 16384,
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
} = verbEvaluationRunner;

export type RetainedRun = ReturnType<typeof parseRetainedRun>;
export type RetainedAttempt = RetainedRun["attempts"][number];

if (import.meta.main) {
	await verbEvaluationRunner.runCli(process.argv.slice(2));
}
