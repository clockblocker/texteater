import type { z } from "zod";

import { assembleSystemPrompt } from "../../../src/promptsmith/assembly";
import { aphorismGrammaticalResolutionExperiment } from "../../../src/promptsmith/laboratory/experiments/grammatical-resolution-aphorism/evaluation-suite";
import { collocationGrammaticalResolutionExperiment } from "../../../src/promptsmith/laboratory/experiments/grammatical-resolution-collocation/evaluation-suite";
import { fusionGrammaticalResolutionExperiment } from "../../../src/promptsmith/laboratory/experiments/grammatical-resolution-fusion/evaluation-suite";
import { idiomGrammaticalResolutionExperiment } from "../../../src/promptsmith/laboratory/experiments/grammatical-resolution-idiom/evaluation-suite";
import { pairedFrameGrammaticalResolutionExperiment } from "../../../src/promptsmith/laboratory/experiments/grammatical-resolution-paired-frame/evaluation-suite";
import * as aphorismRunner from "../grammatical-resolution-aphorism/run";
import * as collocationRunner from "../grammatical-resolution-collocation/run";
import * as fusionRunner from "../grammatical-resolution-fusion/run";
import * as idiomRunner from "../grammatical-resolution-idiom/run";
import * as pairedFrameRunner from "../grammatical-resolution-paired-frame/run";

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
		slug: "aphorism",
		route: "grammatical-resolution/de/phraseme/aphorism",
		schemaName: "grammatical_resolution_aphorism",
		outputSchema:
			aphorismGrammaticalResolutionExperiment.promptSource.outputSchema,
		systemPrompt: assembleSystemPrompt(
			aphorismGrammaticalResolutionExperiment.promptSource,
		),
		prepareCases: cases(aphorismRunner.prepareCurrentTestCases),
		evaluate: (args) =>
			aphorismGrammaticalResolutionExperiment.evaluator(args as never),
		currentBinding: () =>
			aphorismRunner.currentEvidenceBinding(
				aphorismRunner.BATCH_EVIDENCE_TRANSPORT,
			),
		summarize: (attempts, finalized) =>
			aphorismRunner.summarizeEvidence(attempts as never, finalized),
		parseRun: aphorismRunner.parseRetainedRun,
	}),
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
	defineBatchRoute({
		slug: "idiom",
		route: "grammatical-resolution/de/phraseme/idiom",
		schemaName: "grammatical_resolution_idiom",
		outputSchema:
			idiomGrammaticalResolutionExperiment.promptSource.outputSchema,
		systemPrompt: assembleSystemPrompt(
			idiomGrammaticalResolutionExperiment.promptSource,
		),
		prepareCases: cases(idiomRunner.prepareCurrentTestCases),
		evaluate: (args) =>
			idiomGrammaticalResolutionExperiment.evaluator(args as never),
		currentBinding: () =>
			idiomRunner.currentEvidenceBinding(
				idiomRunner.BATCH_EVIDENCE_TRANSPORT,
			),
		summarize: (attempts, finalized) =>
			idiomRunner.summarizeEvidence(attempts as never, finalized),
		parseRun: idiomRunner.parseRetainedRun,
	}),
	defineBatchRoute({
		slug: "fusion",
		route: "grammatical-resolution/de/construction/fusion",
		schemaName: "grammatical_resolution_fusion",
		outputSchema:
			fusionGrammaticalResolutionExperiment.promptSource.outputSchema,
		systemPrompt: assembleSystemPrompt(
			fusionGrammaticalResolutionExperiment.promptSource,
		),
		prepareCases: cases(fusionRunner.prepareCurrentTestCases),
		evaluate: (args) =>
			fusionGrammaticalResolutionExperiment.evaluator(args as never),
		currentBinding: () =>
			fusionRunner.currentEvidenceBinding(
				fusionRunner.BATCH_EVIDENCE_TRANSPORT,
			),
		summarize: (attempts, finalized) =>
			fusionRunner.summarizeEvidence(attempts as never, finalized),
		parseRun: fusionRunner.parseRetainedRun,
	}),
	defineBatchRoute({
		slug: "paired-frame",
		route: "grammatical-resolution/de/construction/paired-frame",
		schemaName: "grammatical_resolution_paired_frame",
		outputSchema:
			pairedFrameGrammaticalResolutionExperiment.promptSource
				.outputSchema,
		systemPrompt: assembleSystemPrompt(
			pairedFrameGrammaticalResolutionExperiment.promptSource,
		),
		prepareCases: cases(pairedFrameRunner.prepareCurrentTestCases),
		evaluate: (args) =>
			pairedFrameGrammaticalResolutionExperiment.evaluator(args as never),
		currentBinding: () =>
			pairedFrameRunner.currentEvidenceBinding(
				pairedFrameRunner.BATCH_EVIDENCE_TRANSPORT,
			),
		summarize: (attempts, finalized) =>
			pairedFrameRunner.summarizeEvidence(attempts as never, finalized),
		parseRun: pairedFrameRunner.parseRetainedRun,
	}),
] satisfies readonly BatchRoute[]);
