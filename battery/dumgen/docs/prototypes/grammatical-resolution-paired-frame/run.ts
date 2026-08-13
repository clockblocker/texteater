// PROTOTYPE ONLY — bounded evaluation configuration for German Construction/PairedFrame.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import {
	createDirectCachedEvaluationRunner,
	DIRECT_CACHED_PROMPT_POLICY,
} from "../../../src/promptsmith/laboratory/experiments/direct-cached-evaluation-runner";
import {
	pairedFrameGrammaticalResolutionAcceptanceExperiment,
	pairedFrameGrammaticalResolutionExperiment,
} from "../../../src/promptsmith/laboratory/experiments/grammatical-resolution-paired-frame/evaluation-suite";

const HERE = dirname(fileURLToPath(import.meta.url));

export const PAIRED_FRAME_PROMPT_CACHE_POLICY = DIRECT_CACHED_PROMPT_POLICY;

export const pairedFrameEvaluationRunner = createDirectCachedEvaluationRunner({
	runnerVersion: "grammatical-resolution-paired-frame-v6",
	route: "grammatical-resolution/de/construction/paired-frame",
	structuredOutputName: "grammatical_resolution_paired_frame",
	experiments: {
		development: pairedFrameGrammaticalResolutionExperiment,
		acceptance: pairedFrameGrammaticalResolutionAcceptanceExperiment,
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
} = pairedFrameEvaluationRunner;

export type RetainedRun = ReturnType<typeof parseRetainedRun>;
export type RetainedAttempt = RetainedRun["attempts"][number];

if (import.meta.main) {
	await pairedFrameEvaluationRunner.runCli(process.argv.slice(2));
}
