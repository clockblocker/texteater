/**
 * The `resolve.reading` experiments of the evaluation table (#873), on the
 * patterns #823 set and `resolve.grammar` follows: corpora from the
 * records and the sidecar (`cases.ts`), one traced run adapter, and cached
 * answers, so a re-score costs no call.
 *
 * - `resolve-reading/de:dev` and `:heldout`: each gold target's
 *   Attestation, Segments and route go in, with its Lemma's gold Readings
 *   across the corpus as the stored candidates, gold's own present in one
 *   arm and removed in the other.
 *
 * Each attempt runs three times, or as many as `repetitions` asks. A live
 * run first prices itself (the cache in `project` mode, answering as gold
 * would), hands the price to `beforeLive`, which may refuse, then fills the
 * cache under the round's caps and runs from it. A run may take only a
 * frozen subset's cases (`subset.ts`): its manifest records the subset, and
 * its report compares each line with the baseline on the same cases.
 */
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as Effect from "effect/Effect";
import {
	defineGoldenCaseCollection,
	defineGoldenCaseGroup,
	defineGoldenCorpus,
} from "promptsmith";
import {
	type OperationEvaluationRun,
	runOperationExperiment,
} from "promptsmith/evaluation";
import { saveRun } from "promptsmith/storage";
import { z } from "zod";
import { createDumgen } from "../../../src/create-dumgen.js";
import { defaultLunaConfiguration, type LunaAsk } from "../../../src/luna.js";
import type { OperationTrace } from "../../../src/operation-trace.js";
import { markedSentence } from "../../../src/resolve/reading.js";
import { type JevAsk, pinnedJevModel } from "../../../src/segment/jev.js";
import {
	type CaseFilter,
	judgmentSettings,
	judgmentSettingsSchema,
} from "../../run-directory.js";
import { storedAs } from "../../stored-json.js";
import { frozenSetSize } from "../frozen-sets.js";
import type { LunaBatch } from "../luna-batch.js";
import { goldRequests } from "../request-diff.js";
import {
	CachedModels,
	type GrammarCaps,
	type GrammarModelsOptions,
	type GrammarPrice,
	type LunaBatchEvent,
	type ModelsSpend,
} from "../resolve-grammar/models.js";
import {
	fillLive,
	openFrozenSet,
	priceRound,
	runModelsOptions,
	selectSubset,
} from "../round-steps.js";
import {
	armsOf,
	candidatesOf,
	loadReadingSet,
	type ReadingArm,
	type ReadingCase,
	type ReadingSetName,
	trackedReadingSetsRoot,
} from "./cases.js";
import { type ReadingAttempt, readingOracle } from "./oracle.js";
import {
	evaluateReading,
	type ReadingOutput,
	readingEvaluationSchema,
	readingOutputSchema,
	readingReport,
	type ScoredReading,
} from "./scoring.js";
import {
	compareReadingWithBaseline,
	loadReadingSubset,
	readingSubsetCaseIds,
} from "./subset.js";

const defaultReadingRoot = fileURLToPath(
	new URL("../../../.runs/resolve-reading/", import.meta.url),
);

const readingRoute = "resolve-reading/de";

/** The package root a subset's path in the manifest is relative to. */
const packageRoot = fileURLToPath(new URL("../../../", import.meta.url));

/** The port's ledger, whose latest round's sizes price a run (#891). */
const readingLedgerPath = fileURLToPath(
	new URL("../../../evidence/resolve-reading/ledger.jsonl", import.meta.url),
);
/** Each attempt runs three times; each repetition is its own cached answer. */
const readingRepetitions = 3;

/**
 * The operation a run measures. 2: Luna answers the Emoji Description as
 * JSON (#526); open-route authored Lemmas can gain a New Reading (#877 R4).
 * 3: the judge reads options as labels and folds when in doubt, authored
 * options are marked, and Luna's prompt and schema rule out non-emoji
 * answers and scene leaks (#877 round 2). 4: the judge tests each option
 * both ways instead of folding when in doubt; Luna labels modality, degree
 * and the copula of being 🟰 (#877 round 3).
 */
const readingOperationVersion = `${readingRoute}@production-4`;

/** A run's projected spend, shaped as resolve.grammar's so one budget guard reads both. */
type ReadingPrice = GrammarPrice;

export type ReadingEvaluateArgs = {
	readonly experimentId: string;
	readonly sourceRevision: string;
	/** Asked on a cache miss in a live run. */
	readonly jev?: JevAsk;
	readonly luna?: LunaAsk;
	/**
	 * Send Luna's cache misses through OpenAI's Batch API in stages instead
	 * of `luna` (#891); evaluation runs only.
	 */
	readonly lunaBatch?: LunaBatch;
	/** Receives each batch as it is sent and settled, for the ledger. */
	readonly onLunaBatch?: (event: LunaBatchEvent) => void | Promise<void>;
	/** The ledger whose latest round's sizes price the run; the port's by default. */
	readonly ledger?: string;
	readonly offline?: boolean;
	/** Price the run and stop: nothing is asked and no run is saved. */
	readonly estimate?: boolean;
	/** With `estimate`: price every request, cached ones included (`wholeRound`). */
	readonly wholeRound?: boolean;
	readonly beforeLive?: (price: ReadingPrice) => void | Promise<void>;
	readonly beforeSpend?: () => void;
	/** The round's hard caps; a live run stops at the first it would cross. */
	readonly caps?: GrammarCaps;
	readonly outputDirectory?: string;
	readonly signal?: AbortSignal;
	readonly concurrency?: number;
	/** The answer cache; `.runs/resolve-reading` by default. */
	readonly root?: string;
	/** The frozen sets; the tracked ones, `evidence/resolve-reading/sets`, by default. */
	readonly setsRoot?: string;
	/** Only these cases, for a smoke run; all by default. */
	readonly limit?: number;
	/** A frozen subset's file (`subset.ts`): only its cases run. */
	readonly subset?: string;
	/** Fewer repetitions than three, for a cheaper round. */
	readonly repetitions?: number;
};

export type ReadingEvaluated = {
	readonly run?: OperationEvaluationRun;
	readonly price?: ReadingPrice;
	readonly spend?: ModelsSpend;
	readonly set?: { readonly name: ReadingSetName; readonly hash: string };
};

/** `resolve.reading`'s cached transports, its projections answered from gold. */
class ReadingModels extends CachedModels<ReadingAttempt> {
	constructor(options: GrammarModelsOptions) {
		super(options, readingOracle);
	}
}

/** What an attempt gives the run: its case, arm and what the metrics read. */
const inputSchema = z.object({
	caseId: z.string(),
	arm: z.enum(["present", "removed"]),
	record: z.string(),
	route: z.string(),
	lemma: z.string(),
	markedSentence: z.string(),
	ideal: z.string(),
	candidates: z.number(),
	authored: z.boolean(),
	folded: z.boolean(),
});
type ReadingInput = z.infer<typeof inputSchema>;

const routeKey = (goldCase: ReadingCase) =>
	`${goldCase.attestation.surface.lemma.family}/${goldCase.attestation.surface.lemma.kind}`;

/** One click's Reading: the answer as a run stores it, with its trace's reason. */
async function attempt(
	goldCase: ReadingCase,
	arm: ReadingArm,
	repetition: number,
	models: Pick<ReadingModels, "jev" | "luna">,
): Promise<ReadingOutput> {
	const traces: OperationTrace[] = [];
	const at = { goldCase, arm };
	const result = await Effect.runPromise(
		createDumgen({
			jev: models.jev(at, repetition),
			luna: models.luna(at, repetition),
			onOperation: (trace) => traces.push(trace),
		}).resolve.reading({
			attestation: goldCase.attestation,
			sentence: goldCase.sentence,
			unit: goldCase.unit,
			candidates: candidatesOf(goldCase, arm),
		}),
	);
	const reason = traces[0]?.resolution?.reason;
	return {
		_tag: result._tag,
		...(result._tag === "CatalogMiss"
			? { message: result.message }
			: { emojiDescription: result.emojiDescription }),
		...(reason === undefined ? {} : { reason }),
	};
}

/** Every case's every arm and repetition, `concurrency` at a time; failures are left for the run. */
async function pass(
	cases: readonly ReadingCase[],
	models: ReadingModels,
	concurrency: number,
	repetitions: number,
): Promise<void> {
	const work = cases.flatMap((goldCase) =>
		armsOf(goldCase).flatMap((arm) =>
			Array.from({ length: repetitions }, (_, repetition) => ({
				goldCase,
				arm,
				repetition,
			})),
		),
	);
	let next = 0;
	await Promise.all(
		Array.from({ length: Math.max(1, concurrency) }, async () => {
			for (;;) {
				const item = work[next++];
				if (!item) return;
				try {
					await attempt(
						item.goldCase,
						item.arm,
						item.repetition,
						models,
					);
				} catch {
					// The run records the failure.
				}
			}
		}),
	);
}

/** The run's id for one case in one arm. */
const attemptId = (goldCase: ReadingCase, arm: ReadingArm) =>
	`${goldCase.id}:${arm}`;

/** The scored attempts of a run, one per case, arm and repetition. */
export function readingAttempts(run: OperationEvaluationRun): ScoredReading[] {
	return run.cases.flatMap((record) => {
		const input = inputSchema.parse(record.input);
		return (record.repetitions ?? [record]).map((repetition, index) => ({
			...input,
			repetition: index,
			evaluation:
				repetition.evaluation === undefined
					? undefined
					: storedAs(
							readingEvaluationSchema,
							repetition.evaluation,
							`Run ${run.manifest.runId}'s evaluation of ${input.caseId}:${input.arm}`,
						),
		}));
	});
}

const caseFilterOf = (run: OperationEvaluationRun): CaseFilter | undefined =>
	judgmentSettings(run, judgmentSettingsSchema).caseFilter;

/**
 * The report of a run (`scoring.ts`). A run on a subset also reports each
 * line against the baseline on the same cases, the attempts that moved
 * from wrong to right, and the guard's regression line.
 */
export function readingMetrics(run: OperationEvaluationRun) {
	const attempts = readingAttempts(run);
	const filter = caseFilterOf(run);
	return {
		...readingReport(attempts),
		...(filter
			? {
					againstBaseline: compareReadingWithBaseline(
						loadReadingSubset(resolve(packageRoot, filter.subset)),
						attempts,
					),
				}
			: {}),
	};
}

/**
 * A frozen set's requests to jev and Luna (`request-diff.ts`): each case's
 * every arm once, the judge answering and Luna writing as gold would, so
 * the requests and outcome are fixed.
 */
async function readingRequests(
	setsRoot: string,
	setName: ReadingSetName,
	concurrency: number,
) {
	const set = await loadReadingSet(setsRoot, setName);
	return goldRequests({
		cases: set.cases.flatMap((goldCase) =>
			armsOf(goldCase).map((arm) => ({
				id: attemptId(goldCase, arm),
				at: { goldCase, arm },
			})),
		),
		oracle: readingOracle,
		attempt: ({ goldCase, arm }, models) =>
			attempt(goldCase, arm, 0, models),
		concurrency,
	});
}

/** The table's entry for one set. */
export function readingExperiment(setName: ReadingSetName) {
	const id = `${readingRoute}:${setName}`;
	return {
		id,
		caseCount: () => frozenSetSize(trackedReadingSetsRoot, setName),
		metrics: readingMetrics,
		requests: (args: {
			readonly setsRoot?: string;
			readonly concurrency?: number;
		}) =>
			readingRequests(
				args.setsRoot ?? trackedReadingSetsRoot,
				setName,
				args.concurrency ?? 12,
			),
		async evaluate(args: ReadingEvaluateArgs): Promise<ReadingEvaluated> {
			const directory = join(args.root ?? defaultReadingRoot, "cache");
			const { set, repetitions } = await openFrozenSet({
				setsRoot: args.setsRoot ?? trackedReadingSetsRoot,
				setName,
				route: readingRoute,
				freezeCommand: "bun cli/resolve-reading.ts freeze",
				load: loadReadingSet,
				maximum: readingRepetitions,
				repetitions: args.repetitions,
			});
			const { cases: selected, caseFilter } = selectSubset({
				set,
				subset: args.subset,
				load: loadReadingSubset,
				caseIds: readingSubsetCaseIds,
			});
			const cases = selected.slice(0, args.limit ?? selected.length);
			const concurrency = args.concurrency ?? 12;
			const identity = { name: set.name, hash: set.hash };
			const attempts = cases.reduce(
				(sum, goldCase) => sum + armsOf(goldCase).length,
				0,
			);
			const passWith = (models: ReadingModels) =>
				pass(cases, models, concurrency, repetitions);
			const priced = await priceRound(args, {
				id,
				ledger: readingLedgerPath,
				directory,
				models: (options) => new ReadingModels(options),
				pass: passWith,
				repetitions,
				attempts: attempts * repetitions,
			});
			const { price } = priced;
			if (args.estimate) return { price, set: identity };
			const live = new ReadingModels(
				runModelsOptions(args, directory, priced),
			);
			await fillLive(args, live, "resolve.reading", () => passWith(live));
			const replay = new ReadingModels({ directory, mode: "offline" });
			const byId = new Map(
				cases.flatMap((goldCase) =>
					armsOf(goldCase).map(
						(arm) =>
							[
								attemptId(goldCase, arm),
								{ goldCase, arm },
							] as const,
					),
				),
			);
			const corpus = defineGoldenCorpus({
				route: readingRoute,
				inputSchema,
				outputSchema: readingOutputSchema,
				collections: {
					dumcorpus: defineGoldenCaseCollection({
						groups: {
							cases: defineGoldenCaseGroup(
								Object.fromEntries(
									[...byId].map(
										([caseId, { goldCase, arm }]) => [
											caseId,
											{
												input: {
													caseId: goldCase.id,
													arm,
													record: goldCase.record,
													route: routeKey(goldCase),
													lemma: goldCase.attestation
														.surface.lemma
														.canonicalForm,
													markedSentence:
														markedSentence(
															goldCase.sentence
																.segments,
															goldCase.unit
																.segments,
														),
													ideal: goldCase.ideal,
													candidates: candidatesOf(
														goldCase,
														arm,
													).length,
													authored: goldCase.authored,
													folded:
														goldCase.rejected
															.length > 0,
												} satisfies ReadingInput,
												idealOutput:
													arm === "present" ||
													goldCase.authored
														? {
																_tag: "Reuse" as const,
																emojiDescription:
																	goldCase.ideal,
															}
														: {
																_tag: "New" as const,
															},
												contaminationKeys: [
													goldCase.record,
												],
											},
										],
									),
								),
							),
						},
						cases: {},
					}),
				},
			});
			const repetitionsSeen = new Map<string, number>();
			const run = await runOperationExperiment({
				experiment: {
					corpus,
					evaluation: corpus.select([...byId.keys()]),
					demonstrations: corpus.select([]),
					// The one traced run adapter: promptsmith runs an attempt's
					// repetitions back to back and passes no index, so they
					// count off the cache's repetitions.
					run: async (input, context) => {
						const id = `${input.caseId}:${input.arm}`;
						const found = byId.get(id);
						if (!found) throw Error(`No case ${id}`);
						const repetition = repetitionsSeen.get(id) ?? 0;
						repetitionsSeen.set(id, repetition + 1);
						const output = await attempt(
							found.goldCase,
							found.arm,
							repetition % repetitions,
							replay,
						);
						context.recordTrace({
							...(output.reason
								? { outcome: output.reason }
								: {}),
							calls: [],
						});
						return output;
					},
					evaluator: ({ caseId, output }) => {
						const found = byId.get(caseId);
						if (!found) throw Error(`No case ${caseId}`);
						return evaluateReading(
							found.goldCase,
							found.arm,
							output,
						);
					},
				},
				experimentId: id,
				operationVersion: readingOperationVersion,
				evaluatorVersion: "resolve-reading-1",
				sourceRevision: args.sourceRevision,
				configurations: {
					generation: {
						model: defaultLunaConfiguration.model,
						settings: JSON.parse(
							JSON.stringify(defaultLunaConfiguration.settings),
						),
					},
					judgment: {
						model: pinnedJevModel,
						settings: {
							set: set.name,
							setHash: set.hash,
							...(caseFilter
								? {
										caseFilter: {
											...caseFilter,
											missed: [...caseFilter.missed],
											guard: [...caseFilter.guard],
										},
									}
								: {}),
						},
					},
				},
				repetitions,
				...(args.signal ? { signal: args.signal } : {}),
			});
			if (args.outputDirectory) await saveRun(args.outputDirectory, run);
			return {
				run,
				...(price ? { price } : {}),
				spend: live.report(),
				set: identity,
			};
		},
	};
}
