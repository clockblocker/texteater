// PROTOTYPE ONLY — bounded evaluation configuration for German Phraseme/DiscourseFormula.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import {
	createDirectCachedEvaluationRunner,
	DIRECT_CACHED_PROMPT_POLICY,
} from "../../../src/promptsmith/laboratory/experiments/direct-cached-evaluation-runner";
import {
	discourseFormulaGrammaticalResolutionAcceptanceExperiment,
	discourseFormulaGrammaticalResolutionExperiment,
} from "../../../src/promptsmith/laboratory/experiments/grammatical-resolution-discourse-formula/evaluation-suite";

const HERE = dirname(fileURLToPath(import.meta.url));

export const DISCOURSE_FORMULA_PROMPT_CACHE_POLICY =
	DIRECT_CACHED_PROMPT_POLICY;

export const discourseFormulaEvaluationRunner =
	createDirectCachedEvaluationRunner({
		runnerVersion: "grammatical-resolution-discourse-formula-v5",
		route: "grammatical-resolution/de/phraseme/discourse-formula",
		structuredOutputName: "grammatical_resolution_discourse_formula",
		experiments: {
			development: discourseFormulaGrammaticalResolutionExperiment,
			acceptance:
				discourseFormulaGrammaticalResolutionAcceptanceExperiment,
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
} = discourseFormulaEvaluationRunner;

export type RetainedRun = ReturnType<typeof parseRetainedRun>;
export type RetainedAttempt = RetainedRun["attempts"][number];

if (import.meta.main) {
	await discourseFormulaEvaluationRunner.runCli(process.argv.slice(2));
}
