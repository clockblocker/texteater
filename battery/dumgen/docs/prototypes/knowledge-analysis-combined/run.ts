// PROTOTYPE ONLY — bounded live evaluation for one combined German Knowledge call.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import { modelOutputSchemaForGermanKnowledge } from "../../../src/knowledge-generation/de/schemas";
import {
	createDirectCachedEvaluationRunner,
	DIRECT_CACHED_PROMPT_POLICY,
} from "../../../src/promptsmith/laboratory/experiments/direct-cached-evaluation-runner";
import {
	combinedGermanKnowledgeAcceptanceExperiment,
	combinedGermanKnowledgeDevelopmentExperiment,
} from "../../../src/promptsmith/laboratory/experiments/knowledge-analysis/de/combined/evaluation-suite";

const HERE = dirname(fileURLToPath(import.meta.url));

export const COMBINED_GERMAN_KNOWLEDGE_PROMPT_CACHE_POLICY =
	DIRECT_CACHED_PROMPT_POLICY;

export const combinedGermanKnowledgeRunner = createDirectCachedEvaluationRunner(
	{
		runnerVersion: "combined-german-knowledge-v2",
		route: "knowledge-analysis/de/combined",
		structuredOutputName: "combined_german_knowledge",
		modelOutputSchemaFor: modelOutputSchemaForGermanKnowledge,
		experiments: {
			development: combinedGermanKnowledgeDevelopmentExperiment,
			acceptance: combinedGermanKnowledgeAcceptanceExperiment,
		},
		diagnosticShape: {
			contractPass: z.boolean(),
			requestShapePass: z.boolean(),
			transcriptionPass: z.boolean(),
			definitionPass: z.boolean(),
			translationPass: z.boolean(),
			relationKindsPass: z.boolean(),
			relationTargetsPass: z.boolean(),
			crossAspectConsistencyPass: z.boolean(),
		},
		limits: {
			maxOutputTokens: 4_096,
			minimumEvaluationCases: 4,
			maximumEvaluationCases: 9,
			minimumScoreRatio: 0.85,
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
	await combinedGermanKnowledgeRunner.runCli(process.argv.slice(2));
}
