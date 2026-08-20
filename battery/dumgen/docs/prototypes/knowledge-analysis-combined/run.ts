// PROTOTYPE ONLY — bounded live evaluation for one combined German Knowledge call.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import { modelOutputSchemaForGermanKnowledge } from "../../../src/knowledge-generation/de/schemas";
import {
	createDirectCachedEvaluationRunner,
	DIRECT_CACHED_PROMPT_POLICY,
} from "../../../src/promptsmith/laboratory/experiments/direct-cached-evaluation-runner";
import { combinedGermanKnowledgeDevelopmentExperiment } from "../../../src/promptsmith/laboratory/experiments/knowledge-analysis/de/combined/evaluation-suite";

const HERE = dirname(fileURLToPath(import.meta.url));

export const COMBINED_GERMAN_KNOWLEDGE_PROMPT_CACHE_POLICY =
	DIRECT_CACHED_PROMPT_POLICY;

export const combinedGermanKnowledgeRunner = createDirectCachedEvaluationRunner(
	{
		runnerVersion: "combined-german-knowledge-v3",
		route: "knowledge-analysis/de/combined",
		structuredOutputName: "combined_german_knowledge",
		modelOutputSchemaFor: modelOutputSchemaForGermanKnowledge,
		experiments: {
			development: combinedGermanKnowledgeDevelopmentExperiment,
			acceptance: {
				unavailableReason:
					"The untouched relation reservation is sealed pending human approval.",
			},
		},
		diagnosticShape: {
			contractPass: z.boolean(),
			requestShapePass: z.boolean(),
			crossAspectConsistencyPass: z.boolean(),
			relationKindsPass: z.boolean(),
			relationExactDiagnosticPass: z.boolean(),
			relationSemanticPass: z.boolean(),
			precisionPass: z.boolean(),
			requiredTargetsPass: z.boolean(),
			nullBehaviorPass: z.boolean(),
			targetFamilyKindPass: z.boolean(),
			kindConfusionPass: z.boolean(),
			harmfulTargetsPass: z.boolean(),
			unclassifiedTargetsPass: z.boolean(),
		},
		limits: {
			maxOutputTokens: 4_096,
			minimumEvaluationCases: 50,
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
	},
);

if (import.meta.main) {
	await combinedGermanKnowledgeRunner.runCli(process.argv.slice(2));
}
