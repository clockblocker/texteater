// PROTOTYPE ONLY — bounded live evaluation for one per-Family German Knowledge call.
// The historical combined route was split per Family (ADR-0020); this runner
// now exposes one direct cached evaluation runner per relation-bearing Family.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import { modelOutputSchemaForGermanKnowledge } from "../../../src/knowledge-generation/de/schemas";
import {
	createDirectCachedEvaluationRunner,
	DIRECT_CACHED_PROMPT_POLICY,
} from "../../../src/promptsmith/laboratory/experiments/direct-cached-evaluation-runner";
import { lexemeGermanKnowledgeDevelopmentExperiment } from "../../../src/promptsmith/laboratory/experiments/knowledge-analysis/de/lexeme/evaluation-suite";
import { phrasemeGermanKnowledgeDevelopmentExperiment } from "../../../src/promptsmith/laboratory/experiments/knowledge-analysis/de/phraseme/evaluation-suite";

const HERE = dirname(fileURLToPath(import.meta.url));

export const COMBINED_GERMAN_KNOWLEDGE_PROMPT_CACHE_POLICY =
	DIRECT_CACHED_PROMPT_POLICY;

const DIAGNOSTIC_SHAPE = {
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
};

const SEALED_ACCEPTANCE = {
	unavailableReason:
		"The untouched relation reservation is sealed pending human approval.",
} as const;

export const lexemeGermanKnowledgeRunner = createDirectCachedEvaluationRunner({
	runnerVersion: "lexeme-german-knowledge-v1",
	route: "knowledge-analysis/de/lexeme",
	structuredOutputName: "lexeme_german_knowledge",
	modelOutputSchemaFor: modelOutputSchemaForGermanKnowledge,
	experiments: {
		development: lexemeGermanKnowledgeDevelopmentExperiment,
		acceptance: SEALED_ACCEPTANCE,
	},
	diagnosticShape: DIAGNOSTIC_SHAPE,
	limits: {
		maxOutputTokens: 4_096,
		minimumEvaluationCases: 48,
		maximumEvaluationCases: 48,
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

export const phrasemeGermanKnowledgeRunner = createDirectCachedEvaluationRunner(
	{
		runnerVersion: "phraseme-german-knowledge-v1",
		route: "knowledge-analysis/de/phraseme",
		structuredOutputName: "phraseme_german_knowledge",
		modelOutputSchemaFor: modelOutputSchemaForGermanKnowledge,
		experiments: {
			development: phrasemeGermanKnowledgeDevelopmentExperiment,
			acceptance: SEALED_ACCEPTANCE,
		},
		diagnosticShape: DIAGNOSTIC_SHAPE,
		limits: {
			maxOutputTokens: 4_096,
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

export const combinedGermanKnowledgeRunner = lexemeGermanKnowledgeRunner;

if (import.meta.main) {
	await lexemeGermanKnowledgeRunner.runCli(process.argv.slice(2));
}
