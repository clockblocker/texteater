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
 * Each attempt runs three times. A live run first prices itself (the
 * cache in `project` mode, answering as gold would), hands the price to
 * `beforeLive`, which may refuse, then fills the cache under the round's
 * caps and runs from it.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
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
import { createDumgen } from "../../create-dumgen.js";
import { defaultLunaConfiguration, type LunaAsk } from "../../luna.js";
import type { OperationTrace } from "../../operation-trace.js";
import { markedSentence } from "../../resolve/reading.js";
import { type JevAsk, pinnedJevModel } from "../../segment/jev.js";
import type { LunaBatch } from "../luna-batch.js";
import {
	CachedModels,
	type GrammarCaps,
	type GrammarModelsOptions,
	type GrammarPrice,
	type LunaBatchEvent,
	type ModelsSpend,
	readLedgerSizes,
} from "../resolve-grammar/models.js";
import {
	armsOf,
	candidatesOf,
	loadReadingSet,
	type ReadingArm,
	type ReadingCase,
	type ReadingSetName,
	readingSetPath,
} from "./cases.js";
import { type ReadingAttempt, readingOracle } from "./oracle.js";
import {
	evaluateReading,
	type ReadingOutput,
	readingOutputSchema,
	readingReport,
	type ScoredReading,
} from "./scoring.js";

export const defaultReadingRoot = fileURLToPath(
	new URL("../../../.runs/resolve-reading/", import.meta.url),
);

export const readingRoute = "resolve-reading/de";

/** The port's ledger, whose latest round's sizes price a run (#891). */
const readingLedgerPath = fileURLToPath(
	new URL("../../../evidence/resolve-reading/ledger.jsonl", import.meta.url),
);
/** Each attempt runs three times; each repetition is its own cached answer. */
export const readingRepetitions = 3;

/**
 * The operation a run measures. 2: Luna answers the Emoji Description as
 * JSON (#526); open-route authored Lemmas can gain a New Reading (#877 R4).
 */
export const readingOperationVersion = `${readingRoute}@production-2`;

/** A run's projected spend, shaped as resolve.grammar's so one budget guard reads both. */
export type ReadingPrice = GrammarPrice;

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
	/** The frozen sets and the answer cache; `.runs/resolve-reading` by default. */
	readonly root?: string;
	/** Only these cases, for a smoke run; all by default. */
	readonly limit?: number;
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
	models: ReadingModels,
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
): Promise<void> {
	const work = cases.flatMap((goldCase) =>
		armsOf(goldCase).flatMap((arm) =>
			Array.from({ length: readingRepetitions }, (_, repetition) => ({
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
			evaluation: repetition.evaluation as ScoredReading["evaluation"],
		}));
	});
}

/** The report of a run (`scoring.ts`). */
export function readingMetrics(run: OperationEvaluationRun) {
	return readingReport(readingAttempts(run));
}

/** The table's entry for one set. */
export function readingExperiment(setName: ReadingSetName) {
	const id = `${readingRoute}:${setName}`;
	return {
		id,
		caseCount: () => {
			const path = readingSetPath(defaultReadingRoot, setName);
			if (!existsSync(path)) return 0;
			return (
				JSON.parse(readFileSync(path, "utf8")) as { cases: unknown[] }
			).cases.length;
		},
		metrics: readingMetrics,
		async evaluate(args: ReadingEvaluateArgs): Promise<ReadingEvaluated> {
			const root = args.root ?? defaultReadingRoot;
			if (!existsSync(readingSetPath(root, setName)))
				throw Error(
					`The ${setName} set of ${readingRoute} is not frozen; run \`bun cli/resolve-reading.ts freeze\` first`,
				);
			const set = await loadReadingSet(root, setName);
			const cases = set.cases.slice(0, args.limit ?? set.cases.length);
			const concurrency = args.concurrency ?? 12;
			const directory = join(root, "cache");
			const identity = { name: set.name, hash: set.hash };
			const attempts = cases.reduce(
				(sum, goldCase) => sum + armsOf(goldCase).length,
				0,
			);
			let price: ReadingPrice | undefined;
			const ledgerSizes =
				args.estimate || !args.offline
					? await readLedgerSizes(
							args.ledger ?? readingLedgerPath,
							id,
						)
					: undefined;
			let stageSizes: ReadingPrice["sizes"]["stages"] | undefined;
			if (args.estimate || !args.offline) {
				const projecting = new ReadingModels({
					directory,
					mode: "project",
					...(ledgerSizes ? { ledgerSizes } : {}),
					...(args.estimate && args.wholeRound
						? { wholeRound: true }
						: {}),
				});
				await pass(cases, projecting, concurrency);
				price = projecting.price(
					readingRepetitions,
					attempts * readingRepetitions,
				);
				stageSizes = price.sizes.stages;
				if (args.estimate) return { price, set: identity };
				await args.beforeLive?.(price);
			}
			const live = new ReadingModels({
				directory,
				mode: args.offline ? "offline" : "live",
				...(args.jev ? { jev: args.jev } : {}),
				...(args.luna ? { luna: args.luna } : {}),
				...(args.lunaBatch ? { lunaBatch: args.lunaBatch } : {}),
				...(args.onLunaBatch ? { onLunaBatch: args.onLunaBatch } : {}),
				...(args.beforeSpend ? { beforeSpend: args.beforeSpend } : {}),
				...(args.caps ? { caps: args.caps } : {}),
				...(ledgerSizes ? { ledgerSizes } : {}),
				...(stageSizes ? { stageSizes } : {}),
			});
			if (!args.offline) {
				if (!args.jev || !(args.luna || args.lunaBatch))
					throw Error(
						"A live resolve.reading run needs jev and Luna",
					);
				// Staged with a batch: each pass stops attempts at their Luna
				// misses, one batch answers them, and the next pass goes on.
				const signal = args.signal ?? new AbortController().signal;
				await live.resumeLunaBatches(signal);
				await pass(cases, live, concurrency);
				while (await live.sendLunaBatch(signal))
					await pass(cases, live, concurrency);
				if (live.capHit !== undefined)
					throw Error(
						`The run stopped at the ${live.capHit}; spent ${JSON.stringify(live.report())}`,
					);
			}
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
					dumspec: defineGoldenCaseCollection(
						`resolve-reading:${set.name}@${set.hash}`,
						{
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
														route: routeKey(
															goldCase,
														),
														lemma: goldCase
															.attestation.surface
															.lemma
															.canonicalForm,
														markedSentence:
															markedSentence(
																goldCase
																	.sentence
																	.segments,
																goldCase.unit
																	.segments,
															),
														ideal: goldCase.ideal,
														candidates:
															candidatesOf(
																goldCase,
																arm,
															).length,
														authored:
															goldCase.authored,
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
						},
					),
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
							repetition % readingRepetitions,
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
						settings: { set: set.name, setHash: set.hash },
					},
				},
				repetitions: readingRepetitions,
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
