// PROTOTYPE ONLY — bounded live evaluation for Reading meaning isolation.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import {
	createDirectCachedEvaluationRunner,
	DIRECT_CACHED_PROMPT_POLICY,
} from "../../../src/promptsmith/laboratory/experiments/direct-cached-evaluation-runner";
import { readingMeaningIsolationExperiment } from "../../../src/promptsmith/laboratory/experiments/reading-resolution/de/meaning-isolation/evaluation-suite";

const HERE = dirname(fileURLToPath(import.meta.url));

export const READING_MEANING_ISOLATION_PROMPT_CACHE_POLICY =
	DIRECT_CACHED_PROMPT_POLICY;

export const readingMeaningIsolationRunner = createDirectCachedEvaluationRunner(
	{
		runnerVersion: "reading-meaning-isolation-v1",
		route: "reading-resolution/de",
		structuredOutputName: "reading_meaning_isolation",
		experiments: {
			development: readingMeaningIsolationExperiment,
			acceptance: {
				unavailableReason:
					"This diagnostic reproducer has no untouched acceptance claim.",
			},
		},
		diagnosticShape: {
			contractPass: z.boolean(),
			decisionPass: z.boolean(),
			noveltyPass: z.boolean(),
			neighborMeaningPass: z.boolean(),
		},
		limits: {
			maxOutputTokens: 64,
			minimumEvaluationCases: 5,
			maximumEvaluationCases: 5,
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
	},
);

if (import.meta.main) {
	await readingMeaningIsolationRunner.runCli(process.argv.slice(2));
}
