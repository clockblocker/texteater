/**
 * The Breakdown segmenters' experiments (`experiments.ts`):
 * `segment-in-constituents/de:breakdown` and
 * `segment-in-morphemes/de:breakdown`, each over its cases from dumcorpus's
 * Breakdown Records (`cases.ts`), scored by `scoring.ts`.
 *
 * Each runs production's operation under `DumgenCore`, as segment.inUnits's
 * evaluation does, with the lab's cached, retrying jev as its transport, so
 * a case the cache holds replays without a call. A run repeats each case
 * three times unless `--repetitions` says fewer, each repetition its own
 * cached answer. `--offline` makes a miss fail its case. `--estimate`
 * prices the run from a projection pass and asks nothing; a live run prices
 * itself the same way first and hands the price to `beforeLive`, where the
 * CLI refuses a run past its granted `--budget`, then fills the cache and
 * runs from it.
 */
import { join } from "node:path";
import { canonicalJson } from "common-utils";
import * as Effect from "effect/Effect";
import {
	defineGoldenCaseCollection,
	defineGoldenCaseGroup,
	defineGoldenCorpus,
} from "promptsmith";
import {
	type OperationEvidence,
	runOperationExperiment,
} from "promptsmith/evaluation";
import { saveRun } from "promptsmith/storage";
import type { z } from "zod";
import { DumgenCore } from "../../../src/dumgen-live.js";
import type {
	InvalidModelOutput,
	ProviderFailure,
} from "../../../src/errors.js";
import { type Jev, JevTransport } from "../../../src/jev-call.js";
import type { LunaAsk } from "../../../src/luna.js";
import { LunaTransport } from "../../../src/luna-call.js";
import { operations } from "../../../src/operations.js";
import type { BreakdownInput } from "../../../src/segment/breakdown.js";
import {
	type CallRecord,
	JevCache,
} from "../../segmentation/harness/jev-cache.js";
import { spendOf } from "../../segmentation/harness/ledger.js";
import {
	type PricedProjection,
	priceProjection,
	standInAnswers,
} from "../../segmentation/harness/round.js";
import type {
	EvaluateArgs,
	Evaluated,
	Experiment,
} from "../experiment-types.js";
import {
	everyAttempt,
	type LabEffect,
	type LabRuntime,
	onLabRuntime,
	runOn,
} from "../lab-runtime.js";
import { defaultLabRoot } from "../segment-in-units-experiment.js";
import {
	type BreakdownCase,
	breakdownInputSchema,
	comparablePiece,
	constituentsCases,
	constituentsOutputSchema,
	morphemesCases,
	morphemesOutputSchema,
} from "./cases.js";
import {
	breakdownMetrics,
	evaluateConstituents,
	evaluateMorphemes,
} from "./scoring.js";

type ModelFailure = ProviderFailure | InvalidModelOutput;

/** Segmentation never receives Luna; `DumgenCore` still asks for one. */
const noLuna: LunaAsk = () =>
	Promise.reject(Error("The Breakdown segmenters never ask Luna"));

const maxRepetitions = 3;

/** One Breakdown segmenter as an experiment runs it. */
type Segmenter<O extends z.ZodType> = {
	readonly route: string;
	readonly outputSchema: O;
	readonly cases: () => BreakdownCase<z.input<O>>[];
	readonly operation: (
		input: BreakdownInput,
	) => Effect.Effect<z.output<O>, ModelFailure, Jev>;
	readonly evaluator: (
		groups: Readonly<Record<string, "phraseme" | "word">>,
	) => (args: {
		readonly caseId: string;
		readonly idealOutput: z.output<O>;
		readonly output: z.output<O>;
	}) => unknown;
};

const constituents: Segmenter<typeof constituentsOutputSchema> = {
	route: "segment-in-constituents/de",
	outputSchema: constituentsOutputSchema,
	cases: constituentsCases,
	operation: (input) =>
		Effect.map(operations.segment.inConstituents(input), (result) =>
			result.kind === "Constituents"
				? {
						kind: "Constituents" as const,
						pieces: result.pieces.map(comparablePiece),
					}
				: { kind: "NoConstituents" as const },
		),
	evaluator: evaluateConstituents,
};

const morphemes: Segmenter<typeof morphemesOutputSchema> = {
	route: "segment-in-morphemes/de",
	outputSchema: morphemesOutputSchema,
	cases: morphemesCases,
	operation: (input) =>
		Effect.map(operations.segment.inMorphemes(input), (pieces) => ({
			pieces: pieces.map(comparablePiece),
		})),
	evaluator: evaluateMorphemes,
};

/** The operation over the cached jev at one repetition, its calls kept in `calls`. */
const attemptOf =
	<O extends z.ZodType>(
		segmenter: Segmenter<O>,
		jev: JevCache,
		calls: CallRecord[],
	) =>
	(input: BreakdownInput, repetition: number): LabEffect<z.output<O>> =>
		segmenter.operation(input).pipe(
			Effect.provide(
				DumgenCore({
					jev: JevTransport.fromAsk(jev.ask(repetition, calls)),
					luna: LunaTransport.fromAsk(noLuna),
					jevModel: jev.model,
				}),
			),
		);

/** The cases a run takes: all, or the ones `caseIds` names, in the set's order. */
function selected<O>(
	cases: readonly BreakdownCase<O>[],
	caseIds: readonly string[] | undefined,
): BreakdownCase<O>[] {
	if (!caseIds) return [...cases];
	const known = new Set(cases.map(({ id }) => id));
	const unknown = caseIds.filter((id) => !known.has(id));
	if (unknown.length > 0)
		throw Error(`The case list names unknown cases: ${unknown.join(", ")}`);
	return cases.filter(({ id }) => caseIds.includes(id));
}

async function evaluateBreakdown<O extends z.ZodType>(
	segmenter: Segmenter<O>,
	id: string,
	args: EvaluateArgs,
	runtime: LabRuntime,
): Promise<Evaluated> {
	const cases = selected(segmenter.cases(), args.caseIds);
	const repetitions = args.repetitions ?? maxRepetitions;
	if (
		!Number.isInteger(repetitions) ||
		repetitions < 1 ||
		repetitions > maxRepetitions
	)
		throw Error(`--repetitions is 1 to ${maxRepetitions}`);
	const live = !args.offline && !args.estimate;
	if (live && !args.jev)
		throw Error(
			`A live ${id} run needs a jev transport; run it --offline or --estimate`,
		);
	const cacheDirectory = join(args.labRoot ?? defaultLabRoot, "cache");
	const jevOf = (options: {
		readonly offline: boolean;
		readonly project?: typeof standInAnswers;
	}) =>
		new JevCache({
			cacheDirectory,
			...(args.judgmentModel ? { model: args.judgmentModel } : {}),
			...(args.jev && !options.offline ? { transport: args.jev } : {}),
			...options,
			...(args.beforeSpend ? { beforeSpend: args.beforeSpend } : {}),
			...(args.onSpend ? { onSpend: args.onSpend } : {}),
		});
	const inputs = cases.flatMap(({ input }) =>
		Array.from({ length: repetitions }, (_, repetition) => ({
			input: breakdownInputSchema.parse(input),
			repetition,
		})),
	);
	const concurrency = args.concurrency ?? 12;
	const pass = (jev: JevCache, calls: CallRecord[]) =>
		runOn(
			runtime,
			everyAttempt(
				inputs,
				({ input, repetition }) =>
					attemptOf(segmenter, jev, calls)(input, repetition),
				concurrency,
			),
			args.signal,
		);
	let projection: PricedProjection | undefined;
	if (args.estimate || live) {
		const projecting = jevOf({ offline: true, project: standInAnswers });
		await pass(projecting, []);
		projection = priceProjection(projecting.projection);
		if (args.estimate) return { projection };
		await args.beforeLive?.(projection);
	}
	const jev = jevOf({ offline: args.offline ?? false });
	const filled: CallRecord[] = [];
	if (live) await pass(jev, filled);
	const calls: CallRecord[] = [];
	const corpus = defineGoldenCorpus({
		route: segmenter.route,
		inputSchema: breakdownInputSchema,
		outputSchema: segmenter.outputSchema,
		collections: {
			breakdown: defineGoldenCaseCollection({
				groups: {
					cases: defineGoldenCaseGroup(
						Object.fromEntries(
							cases.map((entry) => [
								entry.id,
								{
									input: entry.input,
									idealOutput: entry.idealOutput,
									contaminationKeys: [entry.id],
								},
							]),
						),
					),
				},
				cases: {},
			}),
		},
	});
	const configuration = {
		model: jev.model,
		settings: {
			cases: cases.length,
			offline: args.offline ?? false,
			...args.settings,
		},
	};
	// promptsmith runs a case's repetitions back to back and passes no
	// index, so the attempts at one input count off the repetitions.
	const attempts = new Map<string, number>();
	const run = await runOperationExperiment({
		experiment: {
			corpus,
			evaluation: corpus.select(cases.map(({ id }) => id)),
			demonstrations: corpus.select([]),
			run: async (
				input: BreakdownInput,
				context: {
					readonly signal: AbortSignal;
					readonly recordTrace: (trace: OperationEvidence) => void;
				},
			) => {
				const key = canonicalJson(input);
				const attempt = attempts.get(key) ?? 0;
				attempts.set(key, attempt + 1);
				const own: CallRecord[] = [];
				try {
					return await runOn(
						runtime,
						attemptOf(
							segmenter,
							jev,
							own,
						)(input, attempt % repetitions),
						context.signal,
					);
				} finally {
					calls.push(...own);
					context.recordTrace({
						calls: own.map((call) => ({
							executor: "TypeSafe" as const,
							output: {
								usage: {
									input_tokens: call.inputTokens,
									output_tokens: call.outputTokens,
								},
							},
							metadata: {
								stage: call.stage,
								cached: call.cached,
							},
						})),
					});
				}
			},
			evaluator: segmenter.evaluator(
				Object.fromEntries(cases.map(({ id, group }) => [id, group])),
			),
		},
		experimentId: id,
		operationVersion: `${segmenter.route}@production`,
		evaluatorVersion: "breakdown-1",
		sourceRevision: args.sourceRevision,
		// jev picks among code's cuts and forms; nothing else generates.
		configurations: { generation: configuration, judgment: configuration },
		repetitions,
		...(args.signal ? { signal: args.signal } : {}),
	});
	if (args.outputDirectory) await saveRun(args.outputDirectory, run);
	const ran = spendOf(calls);
	const fill = spendOf(filled);
	return {
		run,
		...(projection ? { projection } : {}),
		spend: {
			jev: {
				...ran.jev,
				freshCalls: ran.jev.freshCalls + fill.jev.freshCalls,
				freshInputTokens:
					ran.jev.freshInputTokens + fill.jev.freshInputTokens,
			},
			luna: ran.luna,
		},
		transport: jev.transport,
	};
}

function experimentOf<O extends z.ZodType>(
	segmenter: Segmenter<O>,
): Experiment {
	const id = `${segmenter.route}:breakdown`;
	return {
		id,
		caseCount: () => segmenter.cases().length,
		metrics: breakdownMetrics,
		evaluate: (args) =>
			onLabRuntime(args.runtime, (runtime) =>
				evaluateBreakdown(segmenter, id, args, runtime),
			),
	};
}

/** The Breakdown segmenters' experiments, in the table's order. */
export const breakdownExperiments: readonly Experiment[] = [
	experimentOf(constituents),
	experimentOf(morphemes),
];

/** Whether `id` names a Breakdown segmenter's experiment. */
export const isBreakdownExperiment = (id: string) =>
	breakdownExperiments.some((experiment) => experiment.id === id);
