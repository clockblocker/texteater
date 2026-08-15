// PROTOTYPE ONLY — bounded live evaluation for Unit Shadow Family + Kind.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import {
	createDirectCachedEvaluationRunner,
	DIRECT_CACHED_PROMPT_POLICY,
} from "../../../src/promptsmith/laboratory/experiments/direct-cached-evaluation-runner";
import { unitShadowClassificationExperiment } from "../../../src/promptsmith/laboratory/experiments/unit-shadow-classification/evaluation-suite";

const HERE = dirname(fileURLToPath(import.meta.url));

export const UNIT_SHADOW_PROMPT_CACHE_POLICY = DIRECT_CACHED_PROMPT_POLICY;

export const unitShadowClassificationRunner =
	createDirectCachedEvaluationRunner({
		runnerVersion: "unit-shadow-classification-v2",
		route: "unit-shadow-classification",
		structuredOutputName: "unit_shadow_classification",
		experiments: {
			development: unitShadowClassificationExperiment,
			acceptance: {
				unavailableReason:
					"Issue #118 evaluates the one accepted canonical suite rather than reserving a second private corpus.",
			},
		},
		diagnosticShape: {
			contractPass: z.boolean(),
			decisionPass: z.boolean(),
			familyPass: z.boolean(),
			kindPass: z.boolean(),
		},
		limits: {
			maxOutputTokens: 128,
			minimumEvaluationCases: 40,
			maximumEvaluationCases: 50,
			minimumScoreRatio: 1,
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
} = unitShadowClassificationRunner;

export type RetainedRun = ReturnType<typeof parseRetainedRun>;
export type RetainedAttempt = RetainedRun["attempts"][number];

if (import.meta.main) {
	await unitShadowClassificationRunner.runCli(process.argv.slice(2));
}
