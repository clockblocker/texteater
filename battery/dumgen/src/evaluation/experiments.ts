/**
 * The experiments `cli/evaluate.ts` lists and runs, in one table (#701,
 * #845), each with its corpus, its operation behind one traced run adapter,
 * its evaluator and its metrics:
 *
 * - `segment-in-units/de:<set>`, gold mode: a lab set's gold Segments go in
 *   and the production unit stage's units come out.
 * - `segment-in-units/de:<set>:raw`, raw mode, the production headline: the
 *   record's Sentence goes in, the Segment stage cuts it and the unit stage
 *   groups the Segments (`segment-in-units-raw.ts`).
 * - `split-text/de:ud-drafts`, text mode: `splitText` cuts the ud-drafts
 *   Texts into Sentences (`split-text.ts`).
 * - `resolve-grammar/de:<set>` and `resolve-grammar/de:dev:e2e`: a click's
 *   grammar against dumspec's Attestation gold (#873,
 *   `resolve-grammar/experiment.ts`), with its own frozen sets and cache.
 * - `resolve-reading/de:<set>`: a click's Reading against dumspec's
 *   Reading gold, gold's Reading present among the candidates and removed
 *   from them (#873, `resolve-reading/experiment.ts`), with its own frozen
 *   sets and cache. It shares resolve.grammar's transports, budget guard
 *   and caps.
 * - `knowledge/de:dev`, `:heldout` and `:spot-check`: `knowledge.produce`'s
 *   structural aspects against dumspec's Knowledge gold, and its text
 *   aspects on a human spot-check sample (#887, `knowledge/experiment.ts`),
 *   with the same transports, guard and caps.
 *
 * `<set>` is one of the lab's frozen sets, `dev` or `heldout`. Each case
 * runs three times, as in the lab's runs, and jev answers come through the
 * lab's cache, so a case the lab has run replays without a call.
 * `offline` makes a cache miss fail its case. A live run first prices
 * itself offline (`lab/round.ts`), hands the price to `beforeLive`, which
 * may refuse, then fills the cache concurrently and runs from it.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Effect from "effect/Effect";
import {
	defineGoldenCaseCollection,
	defineGoldenCaseGroup,
	defineGoldenCorpus,
	stableJson,
} from "promptsmith";
import {
	type OperationEvaluationRun,
	type OperationEvidence,
	runOperationExperiment,
} from "promptsmith/evaluation";
import { saveRun } from "promptsmith/storage";
import type { JsonValue, TypeSafeExecutor } from "promptsmith/typesafe";
import type { z } from "zod";
import type { LunaAsk } from "../luna.js";
import { segmentGermanSentence } from "../segment/de/segments.js";
import { segmentGermanUnits } from "../segment/de/units.js";
import type { JevAsk } from "../segment/jev.js";
import { splitText } from "../segment/split-text.js";
import { askOf } from "../segment-in-units/de/arm.js";
import { referenceArm } from "../segment-in-units/de/arms/reference.js";
import {
	type LabCase,
	type LabSet,
	loadSet,
	type SetName,
	setPath,
} from "../segment-in-units/lab/corpus.js";
import {
	type CallRecord,
	Jev,
	Semaphore,
} from "../segment-in-units/lab/jev.js";
import { type Spend, spendOf } from "../segment-in-units/lab/ledger.js";
import {
	type PricedProjection,
	priceProjection,
	standInAnswers,
} from "../segment-in-units/lab/round.js";
import type { LabRun } from "../segment-in-units/lab/run.js";
import { knowledgeExperiment } from "./knowledge/experiment.js";
import type { LunaBatch } from "./luna-batch.js";
import {
	type GrammarEvaluated,
	type GrammarPrice,
	grammarExperiment,
} from "./resolve-grammar/experiment.js";
import type { GrammarCaps, LunaBatchEvent } from "./resolve-grammar/models.js";
import { readingExperiment } from "./resolve-reading/experiment.js";
import {
	evaluateRawSegmentInUnits,
	type RawOutput,
	rawCaseOf,
	rawInputSchema,
	rawOutputSchema,
	rawSegmentInUnitsMetrics,
} from "./segment-in-units-raw.js";
import {
	type SegmentInUnitsInput,
	type SegmentInUnitsOutput,
	segmentInUnitsInputSchema,
	segmentInUnitsOutputSchema,
	segmentInUnitsRoute,
	type Unit,
} from "./spec-corpus/segment-in-units.js";
import { evaluateSegmentInUnits } from "./spec-corpus/segment-in-units-evaluation.js";
import { segmentInUnitsMetrics } from "./spec-corpus/segment-in-units-metrics.js";
import {
	evaluateSplitText,
	type Splitter,
	splitTextInputSchema,
	splitTextMetrics,
	splitTextOutputSchema,
	udDraftTexts,
} from "./split-text.js";

export const defaultLabRoot = fileURLToPath(
	new URL("../../.runs/segment-in-units-lab/", import.meta.url),
);

/** The lab's runs repeat each case three times; each repetition is its own cached answer. */
const repetitions = 3;
const setNames = ["dev", "heldout"] as const satisfies readonly SetName[];

/**
 * The unit stage a segment.inUnits experiment runs: production's, or the
 * #762 reference at its adopted floors, kept for comparison.
 */
export type UnitConfig = "production" | "reference";
export const unitConfigs: readonly UnitConfig[] = ["production", "reference"];

/** What one run of an operation reads: the lab's cached jev at one repetition. */
type Context = {
	readonly jev: Jev;
	readonly repetition: number;
	readonly calls: CallRecord[];
};

const unitStages: Readonly<
	Record<
		UnitConfig,
		(
			segments: SegmentInUnitsInput["segments"],
			context: Context,
		) => Promise<Unit[]>
	>
> = {
	production: (segments, context) =>
		Effect.runPromise(segmentGermanUnits({ segments }, askOf(context))),
	async reference(segments, context) {
		const result = await referenceArm.run(
			{ language: "de", segments },
			{ ...context, options: {} },
		);
		const output = result.outputs[result.primary];
		if (!output) throw Error(`The reference returned no ${result.primary}`);
		return output.units;
	},
};

export type EvaluateArgs = {
	readonly experimentId: string;
	/** Asked on a cache miss when not `offline`. */
	readonly judge: TypeSafeExecutor;
	/** A pinned jev version; the lab's by default. */
	readonly judgmentModel?: string;
	readonly offline?: boolean;
	readonly sourceRevision: string;
	readonly outputDirectory?: string;
	readonly signal?: AbortSignal;
	readonly units?: UnitConfig;
	/** Cases run at once while a live run fills the cache. */
	readonly concurrency?: number;
	readonly labRoot?: string;
	/** Price the run and stop: nothing is asked and no run is saved. */
	readonly estimate?: boolean;
	/** resolve.grammar and resolve.reading: price every request, cached ones included. */
	readonly wholeRound?: boolean;
	/** Receives a live run's price before anything is asked; throw to refuse. */
	readonly beforeLive?: (priced: PricedProjection) => void | Promise<void>;
	/** Called before every fresh request; throw to stop spending. */
	readonly beforeSpend?: () => void;
	/** Receives the input tokens of every fresh request. */
	readonly onSpend?: (inputTokens: number) => void;
	/** Recorded in the run manifest's settings, beside the experiment's own. */
	readonly settings?: Readonly<Record<string, JsonValue>>;
	/** Text mode's splitter; production's `splitText` by default. */
	readonly split?: Splitter;
	/** A live resolve.grammar run's transports, asked on a cache miss. */
	readonly jev?: JevAsk;
	readonly luna?: LunaAsk;
	/** resolve.grammar and resolve.reading: Luna's misses through the Batch API instead (#891). */
	readonly lunaBatch?: LunaBatch;
	/** Receives each Luna batch as it is sent and settled, for the port's ledger. */
	readonly onLunaBatch?: (event: LunaBatchEvent) => void | Promise<void>;
	/** Receives a live resolve.grammar run's price before anything is asked; throw to refuse. */
	readonly beforeGrammarLive?: (price: GrammarPrice) => void | Promise<void>;
	/** resolve.grammar's hard caps on fresh tokens. */
	readonly grammarCaps?: GrammarCaps;
	/** resolve.grammar: only the first this many cases, for a smoke run. */
	readonly limit?: number;
	/** resolve.grammar, resolve.reading and knowledge.produce: a frozen subset's file; only its cases run. */
	readonly grammarSubset?: string;
	/** knowledge.produce: only the cases with gold Knowledge. */
	readonly goldOnly?: boolean;
	/** resolve.grammar and resolve.reading: attempts per case, 1 to 3. */
	readonly repetitions?: number;
	/** resolve.grammar's frozen sets and cache. */
	readonly grammarRoot?: string;
	/** resolve.reading's frozen sets and cache. */
	readonly readingRoot?: string;
	/** knowledge.produce's frozen sets and cache. */
	readonly knowledgeRoot?: string;
};

type Evaluated = {
	/** Absent when only estimated. */
	readonly run?: OperationEvaluationRun;
	readonly projection?: PricedProjection;
	/** The jev calls of the run, the cache fill included; none for text mode. */
	readonly spend?: Spend;
	readonly set?: { readonly name: string; readonly hash: string };
	/** resolve.grammar's projected spend. */
	readonly price?: GrammarPrice;
	/** resolve.grammar's spend, jev and Luna. */
	readonly grammarSpend?: GrammarEvaluated["spend"];
};

type Experiment = {
	readonly id: string;
	readonly caseCount: () => number;
	readonly evaluate: (args: EvaluateArgs) => Promise<Evaluated>;
	readonly metrics: (run: OperationEvaluationRun) => unknown;
};

/** One mode of a segment.inUnits experiment: its cases, operation and scoring. */
type Mode<I extends z.ZodType, O extends z.ZodType> = {
	readonly suffix: string;
	readonly inputSchema: I;
	readonly outputSchema: O;
	readonly caseOf: (labCase: LabCase) => {
		readonly input: z.input<I>;
		readonly idealOutput: z.input<O>;
	};
	readonly run: (
		units: UnitConfig,
	) => (input: z.output<I>, context: Context) => Promise<z.output<O>>;
	readonly evaluator: (
		facts: Readonly<Record<string, LabCase["facts"]>>,
	) => (args: {
		readonly caseId: string;
		readonly input: z.output<I>;
		readonly idealOutput: z.output<O>;
		readonly output: z.output<O>;
	}) => unknown;
	readonly metrics: (run: OperationEvaluationRun) => unknown;
};

const goldMode: Mode<
	typeof segmentInUnitsInputSchema,
	typeof segmentInUnitsOutputSchema
> = {
	suffix: "",
	inputSchema: segmentInUnitsInputSchema,
	outputSchema: segmentInUnitsOutputSchema,
	caseOf: ({ input, idealOutput }) => ({ input, idealOutput }),
	run:
		(units) =>
		async (input, context): Promise<SegmentInUnitsOutput> => ({
			units: await unitStages[units](input.segments, context),
		}),
	evaluator: evaluateSegmentInUnits,
	metrics: segmentInUnitsMetrics,
};

const rawMode: Mode<typeof rawInputSchema, typeof rawOutputSchema> = {
	suffix: ":raw",
	inputSchema: rawInputSchema,
	outputSchema: rawOutputSchema,
	caseOf: rawCaseOf,
	run:
		(units) =>
		async (input, context): Promise<RawOutput> => {
			const segmentation = await Effect.runPromise(
				segmentGermanSentence(input.sentence, askOf(context)),
			);
			const segments = segmentation.segments.map(
				({ kind, text, surface }) => ({
					kind,
					text,
					...(surface === undefined ? {} : { surface }),
				}),
			);
			return {
				segments,
				units: await unitStages[units](segments, context),
				unresolved: [...segmentation.unresolved],
			};
		},
	evaluator: evaluateRawSegmentInUnits,
	metrics: rawSegmentInUnitsMetrics,
};

const idOf = (set: SetName, suffix: string) =>
	`${segmentInUnitsRoute}:${set}${suffix}`;

/** Every case's every repetition through `operation`, `concurrency` at a time; failures are left for the run. */
async function pass<I>(
	cases: readonly { readonly input: I }[],
	operation: (input: I, context: Context) => Promise<unknown>,
	jev: Jev,
	concurrency: number,
	calls: CallRecord[],
): Promise<void> {
	const semaphore = new Semaphore(concurrency);
	await Promise.all(
		cases.flatMap(({ input }) =>
			Array.from({ length: repetitions }, (_, repetition) =>
				semaphore.use(async () => {
					try {
						await operation(input, { jev, repetition, calls });
					} catch {
						// The run records the failure.
					}
				}),
			),
		),
	);
}

/**
 * The one traced run adapter: promptsmith runs a case's repetitions back
 * to back and passes no index, so the attempts at one input count off the
 * cache's repetitions, and each attempt's jev calls become its trace.
 */
function traced<I, O>(
	operation: (input: I, context: Context) => Promise<O>,
	jev: Jev,
	calls: CallRecord[],
) {
	const attempts = new Map<string, number>();
	return async (
		input: I,
		context: { recordTrace: (trace: OperationEvidence) => void },
	): Promise<O> => {
		const key = stableJson(input);
		const attempt = attempts.get(key) ?? 0;
		attempts.set(key, attempt + 1);
		const own: CallRecord[] = [];
		try {
			return await operation(input, {
				jev,
				repetition: attempt % repetitions,
				calls: own,
			});
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
					metadata: { stage: call.stage, cached: call.cached },
				})),
			});
		}
	};
}

function readSetSize(labRoot: string, name: SetName): number {
	const path = setPath(labRoot, name);
	return existsSync(path)
		? (JSON.parse(readFileSync(path, "utf8")) as LabSet).cases.length
		: 0;
}

function segmentInUnitsExperiment<I extends z.ZodType, O extends z.ZodType>(
	mode: Mode<I, O>,
	setName: SetName,
): Experiment {
	const id = idOf(setName, mode.suffix);
	return {
		id,
		caseCount: () => readSetSize(defaultLabRoot, setName),
		metrics: mode.metrics,
		async evaluate(args) {
			const labRoot = args.labRoot ?? defaultLabRoot;
			if (!existsSync(setPath(labRoot, setName)))
				throw Error(
					`The lab's ${setName} set is not frozen; run \`bun run segment-in-units-lab freeze\` first`,
				);
			const set = await loadSet(labRoot, setName);
			const units = args.units ?? "production";
			const operation = mode.run(units);
			const cases = set.cases.map((labCase) => ({
				labCase,
				...mode.caseOf(labCase),
			}));
			// The cache passes read inputs as the run does, parsed.
			const inputs = cases.map(({ input }) => ({
				input: mode.inputSchema.parse(input),
			}));
			const concurrency = args.concurrency ?? 12;
			const jevOf = (options: {
				readonly offline: boolean;
				readonly project?: typeof standInAnswers;
			}) =>
				new Jev({
					cacheDirectory: join(labRoot, "cache"),
					...(args.judgmentModel
						? { model: args.judgmentModel }
						: {}),
					executor: args.judge,
					concurrency,
					...options,
					...(args.beforeSpend
						? { beforeSpend: args.beforeSpend }
						: {}),
					...(args.onSpend ? { onSpend: args.onSpend } : {}),
				});
			const identity = { name: set.name, hash: set.hash };
			let projection: PricedProjection | undefined;
			if (args.estimate || !args.offline) {
				const projecting = jevOf({
					offline: true,
					project: standInAnswers,
				});
				await pass(inputs, operation, projecting, concurrency, []);
				projection = priceProjection(projecting.projection);
				if (args.estimate) return { projection, set: identity };
				await args.beforeLive?.(projection);
			}
			const jev = jevOf({ offline: args.offline ?? false });
			const filled: CallRecord[] = [];
			if (!args.offline)
				await pass(inputs, operation, jev, concurrency, filled);
			const calls: CallRecord[] = [];
			const corpus = defineGoldenCorpus({
				route: segmentInUnitsRoute,
				inputSchema: mode.inputSchema,
				outputSchema: mode.outputSchema,
				collections: {
					lab: defineGoldenCaseCollection({
						groups: {
							cases: defineGoldenCaseGroup(
								Object.fromEntries(
									cases.map((entry) => [
										entry.labCase.id,
										{
											input: entry.input,
											idealOutput: entry.idealOutput,
											contaminationKeys: [
												entry.labCase.record,
											],
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
					units,
					set: set.name,
					setHash: set.hash,
					offline: args.offline ?? false,
					...args.settings,
				},
			};
			const run = await runOperationExperiment({
				experiment: {
					corpus,
					evaluation: corpus.select(set.cases.map(({ id }) => id)),
					demonstrations: corpus.select([]),
					run: traced(operation, jev, calls),
					evaluator: mode.evaluator(
						Object.fromEntries(
							set.cases.map((labCase) => [
								labCase.id,
								labCase.facts,
							]),
						),
					),
				},
				experimentId: id,
				operationVersion: `${segmentInUnitsRoute}${mode.suffix}@${units}`,
				evaluatorVersion: "segment-in-units-2",
				sourceRevision: args.sourceRevision,
				// jev cuts, groups and routes; nothing else generates.
				configurations: {
					generation: configuration,
					judgment: configuration,
				},
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
							ran.jev.freshInputTokens +
							fill.jev.freshInputTokens,
					},
					luna: ran.luna,
				},
				set: identity,
			};
		},
	};
}

const splitTextRoute = "split-text/de";

const splitTextExperiment: Experiment = {
	id: `${splitTextRoute}:ud-drafts`,
	caseCount: () => udDraftTexts().length,
	metrics: splitTextMetrics,
	async evaluate(args) {
		const split = args.split ?? splitText;
		if (args.estimate) return {};
		const texts = udDraftTexts();
		const corpus = defineGoldenCorpus({
			route: splitTextRoute,
			inputSchema: splitTextInputSchema,
			outputSchema: splitTextOutputSchema,
			collections: {
				udDrafts: defineGoldenCaseCollection({
					groups: {
						texts: defineGoldenCaseGroup(
							Object.fromEntries(
								texts.map((text) => [
									text.id,
									{
										input: text.input,
										idealOutput: text.idealOutput,
										contaminationKeys: [text.id],
									},
								]),
							),
						),
					},
					cases: {},
				}),
			},
		});
		const configuration = { model: "code", settings: { ...args.settings } };
		const run = await runOperationExperiment({
			experiment: {
				corpus,
				evaluation: corpus.select(texts.map(({ id }) => id)),
				demonstrations: corpus.select([]),
				run: async (input) => {
					const { paragraphs } = split(input.text);
					return {
						paragraphs: paragraphs.map(({ sentences }) => ({
							sentences: [...sentences],
						})),
					};
				},
				evaluator: evaluateSplitText,
			},
			experimentId: splitTextExperiment.id,
			operationVersion: `${splitTextRoute}@splitText`,
			evaluatorVersion: "split-text-1",
			sourceRevision: args.sourceRevision,
			// Code splits; no model runs.
			configurations: {
				generation: configuration,
				judgment: configuration,
			},
			...(args.signal ? { signal: args.signal } : {}),
		});
		if (args.outputDirectory) await saveRun(args.outputDirectory, run);
		return { run };
	},
};

/** A resolve.grammar entry, its arguments taken from the table's. */
function resolveGrammarEntry(set: "dev" | "heldout", e2e: boolean): Experiment {
	const experiment = grammarExperiment(set, e2e);
	return {
		id: experiment.id,
		caseCount: experiment.caseCount,
		metrics: experiment.metrics,
		async evaluate(args) {
			const evaluated = await experiment.evaluate({
				experimentId: args.experimentId,
				sourceRevision: args.sourceRevision,
				...(args.jev ? { jev: args.jev } : {}),
				...(args.luna ? { luna: args.luna } : {}),
				...(args.lunaBatch ? { lunaBatch: args.lunaBatch } : {}),
				...(args.onLunaBatch ? { onLunaBatch: args.onLunaBatch } : {}),
				...(args.offline ? { offline: true } : {}),
				...(args.estimate ? { estimate: true } : {}),
				...(args.wholeRound ? { wholeRound: true } : {}),
				...(args.beforeGrammarLive
					? { beforeLive: args.beforeGrammarLive }
					: {}),
				...(args.beforeSpend ? { beforeSpend: args.beforeSpend } : {}),
				...(args.outputDirectory
					? { outputDirectory: args.outputDirectory }
					: {}),
				...(args.signal ? { signal: args.signal } : {}),
				...(args.concurrency ? { concurrency: args.concurrency } : {}),
				...(args.grammarRoot ? { root: args.grammarRoot } : {}),
				...(args.labRoot ? { segmentLabRoot: args.labRoot } : {}),
				...(args.limit ? { limit: args.limit } : {}),
				...(args.grammarSubset ? { subset: args.grammarSubset } : {}),
				...(args.repetitions ? { repetitions: args.repetitions } : {}),
				...(args.grammarCaps ? { caps: args.grammarCaps } : {}),
			});
			return {
				...(evaluated.run ? { run: evaluated.run } : {}),
				...(evaluated.price ? { price: evaluated.price } : {}),
				...(evaluated.spend ? { grammarSpend: evaluated.spend } : {}),
				...(evaluated.set ? { set: evaluated.set } : {}),
			};
		},
	};
}

/**
 * A resolve.reading entry, its arguments taken from the table's: the
 * transports, price guard and caps resolve.grammar's runs take.
 */
function resolveReadingEntry(set: "dev" | "heldout"): Experiment {
	const experiment = readingExperiment(set);
	return {
		id: experiment.id,
		caseCount: experiment.caseCount,
		metrics: experiment.metrics,
		async evaluate(args) {
			const evaluated = await experiment.evaluate({
				experimentId: args.experimentId,
				sourceRevision: args.sourceRevision,
				...(args.jev ? { jev: args.jev } : {}),
				...(args.luna ? { luna: args.luna } : {}),
				...(args.lunaBatch ? { lunaBatch: args.lunaBatch } : {}),
				...(args.onLunaBatch ? { onLunaBatch: args.onLunaBatch } : {}),
				...(args.offline ? { offline: true } : {}),
				...(args.estimate ? { estimate: true } : {}),
				...(args.wholeRound ? { wholeRound: true } : {}),
				...(args.beforeGrammarLive
					? { beforeLive: args.beforeGrammarLive }
					: {}),
				...(args.beforeSpend ? { beforeSpend: args.beforeSpend } : {}),
				...(args.outputDirectory
					? { outputDirectory: args.outputDirectory }
					: {}),
				...(args.signal ? { signal: args.signal } : {}),
				...(args.concurrency ? { concurrency: args.concurrency } : {}),
				...(args.readingRoot ? { root: args.readingRoot } : {}),
				...(args.limit ? { limit: args.limit } : {}),
				...(args.grammarSubset ? { subset: args.grammarSubset } : {}),
				...(args.repetitions ? { repetitions: args.repetitions } : {}),
				...(args.grammarCaps ? { caps: args.grammarCaps } : {}),
			});
			return {
				...(evaluated.run ? { run: evaluated.run } : {}),
				...(evaluated.price ? { price: evaluated.price } : {}),
				...(evaluated.spend ? { grammarSpend: evaluated.spend } : {}),
				...(evaluated.set ? { set: evaluated.set } : {}),
			};
		},
	};
}

/**
 * A knowledge.produce entry, its arguments taken from the table's: the
 * transports, price guard and caps resolve.grammar's runs take.
 */
function knowledgeEntry(set: "dev" | "heldout" | "spot-check"): Experiment {
	const experiment = knowledgeExperiment(set);
	return {
		id: experiment.id,
		caseCount: experiment.caseCount,
		metrics: experiment.metrics,
		async evaluate(args) {
			const evaluated = await experiment.evaluate({
				experimentId: args.experimentId,
				sourceRevision: args.sourceRevision,
				...(args.jev ? { jev: args.jev } : {}),
				...(args.luna ? { luna: args.luna } : {}),
				...(args.lunaBatch ? { lunaBatch: args.lunaBatch } : {}),
				...(args.onLunaBatch ? { onLunaBatch: args.onLunaBatch } : {}),
				...(args.offline ? { offline: true } : {}),
				...(args.estimate ? { estimate: true } : {}),
				...(args.wholeRound ? { wholeRound: true } : {}),
				...(args.beforeGrammarLive
					? { beforeLive: args.beforeGrammarLive }
					: {}),
				...(args.beforeSpend ? { beforeSpend: args.beforeSpend } : {}),
				...(args.outputDirectory
					? { outputDirectory: args.outputDirectory }
					: {}),
				...(args.signal ? { signal: args.signal } : {}),
				...(args.concurrency ? { concurrency: args.concurrency } : {}),
				...(args.knowledgeRoot ? { root: args.knowledgeRoot } : {}),
				...(args.limit ? { limit: args.limit } : {}),
				...(args.goldOnly ? { goldOnly: true } : {}),
				...(args.grammarSubset ? { subset: args.grammarSubset } : {}),
				...(args.repetitions ? { repetitions: args.repetitions } : {}),
				...(args.grammarCaps ? { caps: args.grammarCaps } : {}),
			});
			return {
				...(evaluated.run ? { run: evaluated.run } : {}),
				...(evaluated.price ? { price: evaluated.price } : {}),
				...(evaluated.spend ? { grammarSpend: evaluated.spend } : {}),
				...(evaluated.set ? { set: evaluated.set } : {}),
			};
		},
	};
}

const experiments: readonly Experiment[] = [
	...setNames.flatMap((set) => [
		segmentInUnitsExperiment(goldMode, set),
		segmentInUnitsExperiment(rawMode, set),
	]),
	splitTextExperiment,
	resolveGrammarEntry("dev", false),
	resolveGrammarEntry("heldout", false),
	resolveGrammarEntry("dev", true),
	resolveReadingEntry("dev"),
	resolveReadingEntry("heldout"),
	knowledgeEntry("dev"),
	knowledgeEntry("heldout"),
	knowledgeEntry("spot-check"),
];

function experimentOf(id: string): Experiment {
	const experiment = experiments.find((entry) => entry.id === id);
	if (!experiment)
		throw Error(
			`Unknown experiment ${id}; use one of ${experiments.map((entry) => entry.id).join(", ")}`,
		);
	return experiment;
}

/** One entry per experiment; a lab set not frozen yet lists no cases. */
export function listExperiments() {
	return experiments.map((experiment) => {
		const cases = experiment.caseCount();
		return {
			id: experiment.id,
			mode: "Operation" as const,
			demonstrationCount: 0,
			caseCount: cases,
			evaluationCount: cases,
		};
	});
}

/** Whether the experiment asks jev, so its runs count against a round. */
export const spendsJev = (id: string) =>
	experimentOf(id).id.startsWith(`${segmentInUnitsRoute}:`);

/** candidates4's policy that production's unit stage runs (#843): gold mode's parity reference. */
export const productionPolicy = "step0+saying+maxim@0.7+closed";

export const evaluateExperiment = (args: EvaluateArgs) =>
	experimentOf(args.experimentId).evaluate(args);

/** The rates of a run, read the way its experiment scores. */
export const evaluationMetrics = (run: OperationEvaluationRun) =>
	experimentOf(run.manifest.experimentId).metrics(run);

/**
 * An output's units without the closed-class identity production stores
 * since #864, which no lab run recorded.
 */
const withoutIdentity = (output: unknown): unknown => {
	const units = (output as { units?: unknown } | null)?.units;
	return Array.isArray(units)
		? {
				...(output as object),
				units: units.map((unit) => {
					const { identity: _identity, ...rest } = unit as {
						identity?: unknown;
					};
					return rest;
				}),
			}
		: output;
};

/**
 * Gold mode against a lab run, case by case and repetition by repetition:
 * the parity gate of #845. `policy` names the lab output to compare with.
 * The closed-class identity production adds (#864) is left out.
 */
export function parityWith(
	run: OperationEvaluationRun,
	labRun: LabRun,
	policy: string,
) {
	const recorded = new Map(labRun.cases.map((entry) => [entry.id, entry]));
	let compared = 0;
	let identical = 0;
	const differing: string[] = [];
	const failed: string[] = [];
	const missing: string[] = [];
	for (const record of run.cases) {
		const lab = recorded.get(record.caseId);
		if (!lab) {
			missing.push(record.caseId);
			continue;
		}
		const attempts = record.repetitions ?? [record];
		for (const [repetition, attempt] of attempts.entries()) {
			const at = `${record.caseId}#${repetition}`;
			const stored = lab.repetitions[repetition];
			if (attempt.status !== "Success") {
				failed.push(`${at}: ${attempt.error ?? attempt.status}`);
				continue;
			}
			compared++;
			if (
				stableJson(withoutIdentity(attempt.output ?? null)) ===
				stableJson(stored?.outputs?.[policy] ?? null)
			)
				identical++;
			else differing.push(at);
		}
	}
	return { compared, identical, differing, failed, missing };
}
