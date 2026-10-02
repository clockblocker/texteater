import { z } from "zod";
import { assembleSystemPrompt } from "./authoring/assemble-system-prompt.js";
import type {
	Experiment,
	PromptInputSchema,
	PromptOutputSchema,
} from "./authoring/contracts.js";
import { defineExperiment } from "./authoring/define-experiment.js";
import { summarizeQuality } from "./quality.js";
import {
	caseRecordSchema,
	caseRepetitionSchema,
	type caseStabilitySchema,
	configurationSchema,
	evaluationRunSchema,
	runManifestSchema,
	type runStabilitySchema,
} from "./schemas.js";
import {
	repeatedCaseRecord,
	repetitionCount,
	summarizeRunStability,
} from "./stability.js";
import { fingerprint } from "./stable-json.js";

export type {
	OperationEvaluationRun,
	OperationEvidence,
	OperationExperiment,
	StoredRun,
} from "./operation-evaluation.js";
export { runOperationExperiment } from "./operation-evaluation.js";
export { type EvaluationVerdict, summarizeQuality } from "./quality.js";
export type { ComparedVerdict } from "./stability.js";

export type ModelConfiguration = z.infer<typeof configurationSchema>;
export type EvaluationRun = z.infer<typeof evaluationRunSchema>;
export type CaseRecord = z.infer<typeof caseRecordSchema>;
export type CaseRepetition = z.infer<typeof caseRepetitionSchema>;
export type CaseStability = z.infer<typeof caseStabilitySchema>;
export type RunStability = z.infer<typeof runStabilitySchema>;
/** Text generation keeps validation local; structured callers supply a provider schema. */
export type OutputContract =
	| { readonly outputFormat: "text"; readonly outputSchema?: never }
	| {
			readonly outputFormat?: "json";
			readonly outputSchema: Readonly<Record<string, unknown>>;
	  };
export type EvaluationExecutor = (
	request: OutputContract & {
		readonly systemPrompt: string;
		readonly input: unknown;
		readonly cachePrompt?: boolean;
		readonly configuration: ModelConfiguration;
		readonly signal?: AbortSignal;
	},
) => Promise<{ readonly output: unknown; readonly metadata?: unknown }>;

function message(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * Revalidates selections before execution. Each selected case runs
 * `repetitions` times (default 1) and produces one ordered record, including
 * interrupted work.
 */
export async function runExperiment<
	I extends PromptInputSchema,
	O extends PromptOutputSchema,
	R,
>(args: {
	readonly experiment: Experiment<I, O, R>;
	readonly experimentId: string;
	readonly evaluatorVersion: string;
	readonly sourceRevision: string;
	readonly configuration: ModelConfiguration;
	readonly execute: EvaluationExecutor;
	readonly runId?: string;
	readonly signal?: AbortSignal;
	/** Attempts per selected case. Defaults to 1. */
	readonly repetitions?: number;
}): Promise<EvaluationRun> {
	const experiment = defineExperiment(args.experiment);
	const repetitions = repetitionCount(args.repetitions);
	const configuration = configurationSchema.parse(args.configuration);
	const systemPrompt = assembleSystemPrompt(experiment.promptSource);
	const outputSchema = z.toJSONSchema(experiment.promptSource.outputSchema);
	const manifest = runManifestSchema.parse({
		version: 1,
		runId: args.runId ?? crypto.randomUUID(),
		experimentId: args.experimentId,
		evaluatorVersion: args.evaluatorVersion,
		sourceRevision: args.sourceRevision,
		startedAt: new Date().toISOString(),
		prompt: {
			route: experiment.promptSource.route,
			fingerprint: await fingerprint(systemPrompt),
			schemaFingerprint: await fingerprint({
				format: experiment.promptSource.outputFormat ?? "json",
				input: z.toJSONSchema(experiment.promptSource.inputSchema),
				output: outputSchema,
			}),
		},
		corpus: {
			fingerprint: await fingerprint(experiment.evaluation.cases),
			caseIds: experiment.evaluation.ids,
		},
		configuration,
		...(repetitions > 1 ? { repetitions } : {}),
	});
	async function attempt(
		caseId: string,
		golden: (typeof experiment.evaluation.cases)[number],
	): Promise<CaseRepetition> {
		const started = performance.now();
		let result: Awaited<ReturnType<EvaluationExecutor>>;
		if (args.signal?.aborted)
			return caseRepetitionSchema.parse({
				status: "Interrupted",
				durationMs: 0,
				error: "Run interrupted",
			});
		try {
			result = await args.execute({
				systemPrompt,
				input: golden.input,
				...(experiment.promptSource.outputFormat === "text"
					? { outputFormat: "text" as const }
					: { outputSchema }),
				configuration,
				signal: args.signal,
			});
		} catch (error) {
			return caseRepetitionSchema.parse({
				status: args.signal?.aborted
					? "Interrupted"
					: "ProviderFailure",
				durationMs: performance.now() - started,
				error: message(error),
			});
		}
		if (args.signal?.aborted)
			return caseRepetitionSchema.parse({
				status: "Interrupted",
				durationMs: performance.now() - started,
				error: "Run interrupted",
			});
		const parsed = experiment.promptSource.outputSchema.safeParse(
			result.output,
		);
		const exchange = {
			output: z.json().safeParse(result.output).success
				? result.output
				: String(result.output),
			...(result.metadata === undefined
				? {}
				: {
						metadata: z.json().safeParse(result.metadata).success
							? result.metadata
							: String(result.metadata),
					}),
		};
		if (!parsed.success)
			return caseRepetitionSchema.parse({
				...exchange,
				status: "InvalidOutput",
				durationMs: performance.now() - started,
				error: parsed.error.message,
			});
		try {
			const evaluation = experiment.evaluator({
				caseId,
				input: golden.input,
				idealOutput: golden.idealOutput,
				output: parsed.data,
			});
			return caseRepetitionSchema.parse({
				...exchange,
				status: "Success",
				evaluation,
				durationMs: performance.now() - started,
			});
		} catch (error) {
			return caseRepetitionSchema.parse({
				...exchange,
				status: "EvaluationFailure",
				durationMs: performance.now() - started,
				error: message(error),
			});
		}
	}
	const records: CaseRecord[] = [];
	for (const [index, caseId] of experiment.evaluation.ids.entries()) {
		const golden = experiment.evaluation.cases[index];
		if (!golden) throw Error(`Missing selected case ${caseId}`);
		const attempts: CaseRepetition[] = [];
		for (let repetition = 0; repetition < repetitions; repetition++)
			attempts.push(await attempt(caseId, golden));
		records.push(
			caseRecordSchema.parse(
				repeatedCaseRecord(
					{
						caseId,
						input: golden.input,
						idealOutput: golden.idealOutput,
					},
					attempts,
				),
			),
		);
	}
	const succeeded = records.filter(
		(record) => record.status === "Success",
	).length;
	const interrupted = records.filter(
		(record) => record.status === "Interrupted",
	).length;
	const failed = records.length - succeeded - interrupted;
	return evaluationRunSchema.parse({
		manifest,
		cases: records,
		summary: {
			quality: summarizeQuality(records),
			status: interrupted
				? "Interrupted"
				: failed
					? "Failed"
					: "Completed",
			finishedAt: new Date().toISOString(),
			total: records.length,
			succeeded,
			failed,
			interrupted,
			...(repetitions > 1
				? { stability: summarizeRunStability(records, repetitions) }
				: {}),
		},
	});
}
