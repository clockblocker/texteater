import { z } from "zod";
import { assembleSystemPrompt } from "./authoring/assemble-system-prompt.js";
import type {
	Experiment,
	PromptInputSchema,
	PromptOutputSchema,
} from "./authoring/contracts.js";
import { defineExperiment } from "./authoring/define-experiment.js";
import {
	caseRecordSchema,
	configurationSchema,
	evaluationRunSchema,
	runManifestSchema,
} from "./schemas.js";
import { stableJson } from "./stable-json.js";

export type ModelConfiguration = z.infer<typeof configurationSchema>;
export type EvaluationRun = z.infer<typeof evaluationRunSchema>;
export type CaseRecord = z.infer<typeof caseRecordSchema>;
export type EvaluationExecutor = (request: {
	readonly systemPrompt: string;
	readonly input: unknown;
	readonly outputSchema: Record<string, unknown>;
	readonly configuration: ModelConfiguration;
	readonly signal?: AbortSignal;
}) => Promise<{ readonly output: unknown; readonly metadata?: unknown }>;

export async function fingerprint(value: unknown): Promise<string> {
	const bytes = new TextEncoder().encode(stableJson(value));
	const hash = await crypto.subtle.digest("SHA-256", bytes);
	return Array.from(new Uint8Array(hash), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
}
function message(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/** Revalidates selections before execution. Each selected case produces one ordered record, including interrupted work. */
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
}): Promise<EvaluationRun> {
	const experiment = defineExperiment(args.experiment);
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
				input: z.toJSONSchema(experiment.promptSource.inputSchema),
				output: outputSchema,
			}),
		},
		corpus: {
			fingerprint: await fingerprint(experiment.evaluation.cases),
			caseIds: experiment.evaluation.ids,
		},
		configuration,
	});
	const records: CaseRecord[] = [];
	for (const [index, caseId] of experiment.evaluation.ids.entries()) {
		const golden = experiment.evaluation.cases[index];
		if (!golden) throw Error(`Missing selected case ${caseId}`);
		const base = {
			caseId,
			input: golden.input,
			idealOutput: golden.idealOutput,
		};
		const started = performance.now();
		let result: Awaited<ReturnType<EvaluationExecutor>>;
		if (args.signal?.aborted) {
			records.push(
				caseRecordSchema.parse({
					...base,
					status: "Interrupted",
					durationMs: 0,
					error: "Run interrupted",
				}),
			);
			continue;
		}
		try {
			result = await args.execute({
				systemPrompt,
				input: golden.input,
				outputSchema,
				configuration,
				signal: args.signal,
			});
		} catch (error) {
			records.push(
				caseRecordSchema.parse({
					...base,
					status: args.signal?.aborted
						? "Interrupted"
						: "ProviderFailure",
					durationMs: performance.now() - started,
					error: message(error),
				}),
			);
			continue;
		}
		if (args.signal?.aborted) {
			records.push(
				caseRecordSchema.parse({
					...base,
					status: "Interrupted",
					durationMs: performance.now() - started,
					error: "Run interrupted",
				}),
			);
			continue;
		}
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
		if (!parsed.success) {
			records.push(
				caseRecordSchema.parse({
					...base,
					...exchange,
					status: "InvalidOutput",
					durationMs: performance.now() - started,
					error: parsed.error.message,
				}),
			);
			continue;
		}
		try {
			const evaluation = experiment.evaluator({
				caseId,
				input: golden.input,
				idealOutput: golden.idealOutput,
				output: parsed.data,
			});
			records.push(
				caseRecordSchema.parse({
					...base,
					...exchange,
					status: "Success",
					evaluation,
					durationMs: performance.now() - started,
				}),
			);
		} catch (error) {
			records.push(
				caseRecordSchema.parse({
					...base,
					...exchange,
					status: "EvaluationFailure",
					durationMs: performance.now() - started,
					error: message(error),
				}),
			);
		}
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
		},
	});
}
