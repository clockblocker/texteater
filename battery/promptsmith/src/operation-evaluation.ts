import type { z } from "zod";
import type {
	CaseSelection,
	ExperimentEvaluation,
	GoldenCorpus,
} from "./authoring/contracts.js";
import {
	getGoldenCorpusState,
	getSelectionState,
} from "./authoring/golden-corpus.js";
import { assertCaseSelectionsUncontaminated } from "./authoring/selection-contamination.js";
import { summarizeQuality } from "./quality.js";
import {
	type configurationSchema,
	operationCaseRecordSchema,
	operationCaseRepetitionSchema,
	operationEvaluationRunSchema,
	operationManifestSchema,
	type storedRunSchema,
} from "./schemas.js";
import {
	repeatedCaseRecord,
	repetitionCount,
	summarizeRunStability,
} from "./stability.js";
import { fingerprint } from "./stable-json.js";

type ModelConfiguration = z.infer<typeof configurationSchema>;

export type OperationEvaluationRun = z.infer<
	typeof operationEvaluationRunSchema
>;
export type StoredRun = z.infer<typeof storedRunSchema>;
type OperationCaseRecord = z.infer<typeof operationCaseRecordSchema>;
type OperationCaseRepetition = z.infer<typeof operationCaseRepetitionSchema>;
export type OperationEvidence = {
	readonly outcome?: string;
	readonly calls: readonly {
		readonly executor: "TypeSafe" | "Luna";
		readonly output?: unknown;
		readonly metadata?: unknown;
	}[];
};
export type OperationExperiment<I extends z.ZodType, O extends z.ZodType, R> = {
	readonly corpus: GoldenCorpus<I, O>;
	readonly evaluation: CaseSelection<I, O>;
	readonly demonstrations: CaseSelection<I, O>;
	/** Call the production operation and forward its complete trace callback. */
	readonly run: (
		input: z.output<I>,
		context: {
			signal: AbortSignal;
			recordTrace: (trace: OperationEvidence) => void;
		},
	) => Promise<z.output<O>>;
	readonly evaluator: ExperimentEvaluation<I, O, R>;
};

function usage(traces: readonly OperationEvidence[]) {
	const calls = traces.flatMap((trace) => trace.calls);
	function tokens(key: "input_tokens" | "output_tokens"): number | null {
		let total = 0;
		for (const call of calls) {
			const evidence =
				call.executor === "TypeSafe" ? call.output : call.metadata;
			if (
				!evidence ||
				typeof evidence !== "object" ||
				!("usage" in evidence)
			)
				return null;
			const reported = evidence.usage;
			if (!reported || typeof reported !== "object" || !(key in reported))
				return null;
			const count = (reported as Record<string, unknown>)[key];
			if (
				typeof count !== "number" ||
				!Number.isFinite(count) ||
				count < 0
			)
				return null;
			total += count;
		}
		return total;
	}
	return {
		calls: calls.length,
		usage: {
			inputTokens: tokens("input_tokens"),
			outputTokens: tokens("output_tokens"),
		},
	};
}

/**
 * Runs each selected case `repetitions` times (default 1) through production
 * orchestration and returns immutable v2 evidence. Repetitions of one case run
 * back to back; every repetition is recorded.
 */
export async function runOperationExperiment<
	I extends z.ZodType,
	O extends z.ZodType,
	R,
>(args: {
	readonly experiment: OperationExperiment<I, O, R>;
	readonly experimentId: string;
	readonly operationVersion: string;
	readonly evaluatorVersion: string;
	readonly sourceRevision: string;
	readonly configurations: {
		generation: ModelConfiguration;
		judgment: ModelConfiguration;
	};
	readonly signal?: AbortSignal;
	readonly runId?: string;
	/** Attempts per selected case. Defaults to 1. */
	readonly repetitions?: number;
}): Promise<OperationEvaluationRun> {
	const { experiment } = args;
	const repetitions = repetitionCount(args.repetitions);
	const canonical = getGoldenCorpusState(experiment.corpus);
	for (const selection of [
		experiment.evaluation,
		experiment.demonstrations,
	]) {
		if (getSelectionState(selection).corpus.identity !== canonical.identity)
			throw Error(
				"Operation selections must belong to their canonical corpus",
			);
	}
	assertCaseSelectionsUncontaminated({
		route: experiment.corpus.route,
		demonstrations: experiment.demonstrations,
		evaluation: experiment.evaluation,
	});
	const manifest = operationManifestSchema.parse({
		version: 2,
		runId: args.runId ?? crypto.randomUUID(),
		experimentId: args.experimentId,
		operationVersion: args.operationVersion,
		evaluatorVersion: args.evaluatorVersion,
		sourceRevision: args.sourceRevision,
		startedAt: new Date().toISOString(),
		configurations: args.configurations,
		corpus: {
			fingerprint: await fingerprint(experiment.evaluation.cases),
			caseIds: experiment.evaluation.ids,
		},
		...(repetitions > 1 ? { repetitions } : {}),
	});
	const records: OperationCaseRecord[] = [];
	const signal = args.signal ?? new AbortController().signal;
	async function attempt(
		caseId: string,
		golden: (typeof experiment.evaluation.cases)[number],
	): Promise<OperationCaseRepetition> {
		const start = performance.now();
		const traces: OperationEvidence[] = [];
		let status: OperationCaseRepetition["status"] = "Success";
		let output: unknown;
		let evaluation: unknown;
		let errorMessage: string | undefined;
		try {
			signal.throwIfAborted();
			output = await experiment.run(golden.input, {
				signal,
				recordTrace: (trace) => traces.push(trace),
			});
			signal.throwIfAborted();
			const parsed = experiment.corpus.outputSchema.safeParse(output);
			if (!parsed.success) {
				status = "InvalidOutput";
				throw parsed.error;
			}
			status = "EvaluationFailure";
			evaluation = experiment.evaluator({
				caseId,
				input: golden.input,
				idealOutput: golden.idealOutput,
				output: parsed.data,
			});
			status = traces.some((trace) => trace.outcome === "Partial")
				? "Partial"
				: "Success";
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : String(error);
			const tag =
				error && typeof error === "object" && "_tag" in error
					? error._tag
					: undefined;
			if (signal.aborted) status = "Interrupted";
			else if (tag === "InvalidModelOutput") status = "InvalidOutput";
			else if (
				tag === "Unresolved" ||
				tag === "CatalogMiss" ||
				tag === "InvalidInput" ||
				tag === "NotImplemented" ||
				tag === "ProviderFailure"
			)
				status = tag;
			else if (status === "Success") status = "EvaluationFailure";
		}
		return operationCaseRepetitionSchema.parse(
			JSON.parse(
				JSON.stringify({
					output,
					evaluation,
					status,
					error: errorMessage,
					traces,
					...usage(traces),
					durationMs: performance.now() - start,
				}),
			),
		);
	}
	for (const [index, caseId] of experiment.evaluation.ids.entries()) {
		const golden = experiment.evaluation.cases[index];
		if (!golden) throw Error(`Missing selected case ${caseId}`);
		const attempts: OperationCaseRepetition[] = [];
		for (let repetition = 0; repetition < repetitions; repetition++)
			attempts.push(await attempt(caseId, golden));
		records.push(
			operationCaseRecordSchema.parse(
				repeatedCaseRecord(
					JSON.parse(
						JSON.stringify({
							caseId,
							input: golden.input,
							idealOutput: golden.idealOutput,
						}),
					),
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
	return operationEvaluationRunSchema.parse({
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
			interrupted,
			failed,
			...(repetitions > 1
				? { stability: summarizeRunStability(records, repetitions) }
				: {}),
		},
	});
}
