import type { z } from "zod";

import { assembleSystemPrompt } from "../../../src/promptsmith/assembly";
import { collocationGrammaticalResolutionExperiment } from "../../../src/promptsmith/laboratory/experiments/grammatical-resolution-collocation/evaluation-suite";
import * as collocationRunner from "../grammatical-resolution-collocation/run";

export type BatchPreparedCase = {
	readonly id: string;
	readonly input: unknown;
	readonly idealOutput: unknown;
};

export type BatchRoute = {
	readonly slug: string;
	readonly route: string;
	readonly schemaName: string;
	readonly outputSchema: z.ZodType;
	readonly systemPrompt: string;
	readonly prepareCases: () => readonly BatchPreparedCase[];
	readonly evaluate: (args: {
		readonly caseId: string;
		readonly input: unknown;
		readonly idealOutput: unknown;
		readonly output: unknown;
	}) => Readonly<Record<string, boolean>>;
	readonly currentBinding: () => Readonly<Record<string, unknown>>;
	readonly summarize: (
		attempts: readonly Readonly<Record<string, unknown>>[],
		finalized: boolean,
	) => Readonly<Record<string, unknown>>;
	readonly parseRun: (value: unknown) => unknown;
};

function defineBatchRoute(args: BatchRoute): BatchRoute {
	return Object.freeze(args);
}

function cases(
	prepare: () => readonly {
		readonly id: string;
		readonly input: unknown;
		readonly idealOutput: unknown;
	}[],
): () => readonly BatchPreparedCase[] {
	return prepare;
}

export const BATCH_ROUTES = Object.freeze([
	defineBatchRoute({
		slug: "collocation",
		route: "grammatical-resolution/de/phraseme/collocation",
		schemaName: "grammatical_resolution_collocation",
		outputSchema:
			collocationGrammaticalResolutionExperiment.promptSource
				.outputSchema,
		systemPrompt: assembleSystemPrompt(
			collocationGrammaticalResolutionExperiment.promptSource,
		),
		prepareCases: cases(collocationRunner.prepareCurrentTestCases),
		evaluate: (args) =>
			collocationGrammaticalResolutionExperiment.evaluator(args as never),
		currentBinding: () =>
			collocationRunner.currentEvidenceBinding(
				collocationRunner.BATCH_EVIDENCE_TRANSPORT,
			),
		summarize: (attempts, finalized) =>
			collocationRunner.summarizeEvidence(attempts as never, finalized),
		parseRun: collocationRunner.parseRetainedRun,
	}),
] satisfies readonly BatchRoute[]);
