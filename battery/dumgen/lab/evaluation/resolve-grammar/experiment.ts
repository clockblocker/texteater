/**
 * The `resolve.grammar` experiments of the evaluation table (#873), on the
 * patterns #823 set: corpora from the records and the sidecar
 * (`cases.ts`), one traced run adapter, and cached answers, so a re-score
 * costs no call.
 *
 * - `resolve-grammar/de:dev` and `:heldout`, the headline: each gold
 *   target's Segments and route go in as the stored unit.
 * - `resolve-grammar/de:dev:e2e`, the secondary line: segment.inUnits'
 *   cached units for the record's Sentence go in, and only the units that
 *   match a gold target (same Segments, same route) are scored.
 *
 * Each case runs three times, or as many as `repetitions` asks. A live run
 * first prices itself (`models.ts` in `project` mode), hands the price to
 * `beforeLive`, which may refuse, then fills the cache concurrently and
 * runs from it. A run may take only a frozen subset's cases (`subset.ts`):
 * the baseline's misses and a seeded guard, its seed and case ids
 * recorded in the manifest, and its report compared with the baseline's.
 */
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson } from "common-utils";
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
import { type JevAsk, pinnedJevModel } from "../../../src/segment/jev.js";
import type { Unit } from "../../../src/segment/segmented-sentence.js";
import {
	type CaseFilter,
	judgmentSettings,
	judgmentSettingsSchema,
} from "../../run-directory.js";
import { loadSet, trackedSetsRoot } from "../../segmentation/harness/corpus.js";
import { JevCache } from "../../segmentation/harness/jev-cache.js";
import { storedAs } from "../../stored-json.js";
import { frozenSetSize, isFrozen } from "../frozen-sets.js";
import type { LunaBatch } from "../luna-batch.js";
import { groupSegments } from "../production-segmenter.js";
import { goldRequests } from "../request-diff.js";
import {
	type GrammarCase,
	type GrammarSetName,
	loadGrammarSet,
	trackedGrammarSetsRoot,
} from "./cases.js";
import {
	type GrammarCaps,
	GrammarModels,
	type GrammarPrice,
	type LunaBatchEvent,
	type ModelsSpend,
	readLedgerSizes,
} from "./models.js";
import { goldAnswers, goldWritten } from "./oracle.js";
import {
	evaluateGrammar,
	type GrammarOutput,
	grammarEvaluationSchema,
	grammarOutputSchema,
	grammarReport,
	lineOf,
	type ScoredAttempt,
} from "./scoring.js";
import { compareWithBaseline, loadSubset, subsetCaseIds } from "./subset.js";

const defaultGrammarRoot = fileURLToPath(
	new URL("../../../.runs/resolve-grammar/", import.meta.url),
);
const defaultSegmentLabRoot = fileURLToPath(
	new URL("../../../.runs/segment-in-units-lab/", import.meta.url),
);
/** The package root a subset's path in the manifest is relative to. */
const packageRoot = fileURLToPath(new URL("../../../", import.meta.url));

const grammarRoute = "resolve-grammar/de";
/** Each case runs three times; each repetition is its own cached answer. */
const grammarRepetitions = 3;

export type { GrammarPrice } from "./models.js";

/** The port's ledger, whose latest round's sizes price a run (#891). */
const grammarLedgerPath = fileURLToPath(
	new URL("../../../evidence/resolve-grammar/ledger.jsonl", import.meta.url),
);

export type GrammarEvaluateArgs = {
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
	readonly beforeLive?: (price: GrammarPrice) => void | Promise<void>;
	readonly beforeSpend?: () => void;
	/** The round's hard caps; a live run stops at the first it would cross. */
	readonly caps?: GrammarCaps;
	readonly outputDirectory?: string;
	readonly signal?: AbortSignal;
	readonly concurrency?: number;
	/** The answer cache; `.runs/resolve-grammar` by default. */
	readonly root?: string;
	/** The frozen sets; the tracked ones, `evidence/resolve-grammar/sets`, by default. */
	readonly setsRoot?: string;
	/** The segment.inUnits lab whose cached answers the end-to-end line replays. */
	readonly segmentLabRoot?: string;
	/** The segment.inUnits lab's frozen sets; the tracked ones by default. */
	readonly segmentSetsRoot?: string;
	/** Only these cases, for a smoke run; all by default. */
	readonly limit?: number;
	/** A frozen subset's file (`subset.ts`): only its cases run. */
	readonly subset?: string;
	/** Attempts per case, 1 to 3; three by default. */
	readonly repetitions?: number;
};

export type GrammarEvaluated = {
	readonly run?: OperationEvaluationRun;
	readonly price?: GrammarPrice;
	readonly spend?: ModelsSpend;
	readonly set?: { readonly name: GrammarSetName; readonly hash: string };
};

/** What a case gives the run: its id and what the metrics read. */
const inputSchema = z.object({
	caseId: z.string(),
	record: z.string(),
	route: z.string(),
	rules: z.array(z.string()),
});
type GrammarInput = z.infer<typeof inputSchema>;

const routeKey = (goldCase: GrammarCase) =>
	`${goldCase.ideal.surface.lemma.family}/${goldCase.ideal.surface.lemma.kind}`;

/** The units segment.inUnits' production stage gives one Sentence, from the lab's cache. */
type UnitSource = (
	goldCase: GrammarCase,
	repetition: number,
) => Promise<readonly Unit[] | undefined>;

/** One attempt: the click, its outcome as a run stores it, and its trace's reason. */
async function attempt(
	goldCase: GrammarCase,
	repetition: number,
	models: Pick<GrammarModels, "jev" | "luna">,
	units?: UnitSource,
): Promise<GrammarOutput> {
	let unit = goldCase.unit;
	if (units) {
		const produced = await units(goldCase, repetition);
		const match = produced?.find(
			(candidate) =>
				canonicalJson(candidate.segments) ===
					canonicalJson(goldCase.unit.segments) &&
				canonicalJson(candidate.route) ===
					canonicalJson(goldCase.unit.route),
		);
		if (!match)
			return {
				_tag: "NoMatchingUnit",
				reason: produced ? "NoMatchingUnit" : "NoCachedUnits",
			};
		unit = match;
	}
	const traces: OperationTrace[] = [];
	const result = await Effect.runPromise(
		createDumgen({
			jev: models.jev(goldCase, repetition),
			luna: models.luna(goldCase, repetition),
			onOperation: (trace) => traces.push(trace),
		}).resolve.grammar({
			language: "de",
			sentence: goldCase.sentence,
			unit,
			neighbours: {},
			lemmaCandidates: [],
		}),
	);
	const reason = traces[0]?.resolution?.reason;
	return {
		_tag: result._tag,
		...(result._tag === "Resolved"
			? { attestation: result.attestation }
			: {}),
		...(result._tag === "CatalogMiss" ? { message: result.message } : {}),
		...(reason === undefined ? {} : { reason }),
	};
}

/** Every case's every repetition, `concurrency` at a time; failures are left for the run. */
async function pass(
	cases: readonly GrammarCase[],
	models: GrammarModels,
	concurrency: number,
	repetitions: number,
	units?: UnitSource,
): Promise<void> {
	const work = cases.flatMap((goldCase) =>
		Array.from({ length: repetitions }, (_, repetition) => ({
			goldCase,
			repetition,
		})),
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
						item.repetition,
						models,
						units,
					);
				} catch {
					// The run records the failure.
				}
			}
		}),
	);
}

/**
 * segment.inUnits' production units for a case's record, replayed from the
 * lab's cache at the attempt's repetition (gold Segments in, as the lab's
 * gold mode runs); undefined when the lab set lacks the record or the
 * cache misses.
 */
async function cachedUnits(
	labRoot: string,
	setsRoot: string,
): Promise<UnitSource> {
	const set = await loadSet(setsRoot, "dev");
	const byRecord = new Map(
		set.cases.map((labCase) => [labCase.record, labCase]),
	);
	const jev = new JevCache({
		cacheDirectory: join(labRoot, "cache"),
		offline: true,
	});
	const memo = new Map<string, Promise<readonly Unit[] | undefined>>();
	return (goldCase, repetition) => {
		const key = `${goldCase.record}#${repetition}`;
		let units = memo.get(key);
		if (!units) {
			const labCase = byRecord.get(goldCase.record);
			units = labCase
				? groupSegments(
						{ ask: jev.ask(repetition), model: jev.model },
						labCase.input.segments,
					).catch(() => undefined)
				: Promise.resolve(undefined);
			memo.set(key, units);
		}
		return units;
	};
}

/** The scored attempts of a run, one per case and repetition. */
export function grammarAttempts(run: OperationEvaluationRun): ScoredAttempt[] {
	return run.cases.flatMap((record) => {
		const input = inputSchema.parse(record.input);
		return (record.repetitions ?? [record]).map((repetition, index) => ({
			caseId: input.caseId,
			repetition: index,
			route: input.route,
			record: input.record,
			rules: input.rules,
			evaluation:
				repetition.evaluation === undefined
					? undefined
					: storedAs(
							grammarEvaluationSchema,
							repetition.evaluation,
							`Run ${run.manifest.runId}'s evaluation of ${input.caseId}`,
						),
		}));
	});
}

const caseFilterOf = (run: OperationEvaluationRun): CaseFilter | undefined =>
	judgmentSettings(run, judgmentSettingsSchema).caseFilter;

/**
 * The headline report of a run. The end-to-end line scores only the units
 * that matched gold and says how many did. A run on a subset also reports
 * each line against the baseline on the same cases, the cases that moved
 * from wrong to right, and the guard's regression line.
 */
export function grammarMetrics(run: OperationEvaluationRun) {
	const attempts = grammarAttempts(run);
	const filter = caseFilterOf(run);
	const matched = attempts.filter(
		({ evaluation }) => evaluation?.outcome !== "NoMatchingUnit",
	);
	const e2e = run.manifest.experimentId.endsWith(":e2e");
	return {
		...(e2e
			? {
					matchedUnits: lineOf(
						attempts.map(
							({ evaluation }) =>
								evaluation?.outcome !== "NoMatchingUnit",
						),
					),
				}
			: {}),
		...grammarReport(e2e ? matched : attempts),
		...(filter
			? {
					againstBaseline: compareWithBaseline(
						loadSubset(resolve(packageRoot, filter.subset)),
						attempts,
					),
				}
			: {}),
	};
}

/**
 * A frozen set's requests to jev and Luna (`request-diff.ts`): each case
 * once, every question answered as gold answers it and every Canonical
 * Form call as gold writes it, so the requests and outcome are fixed.
 */
async function grammarRequests(
	setsRoot: string,
	setName: GrammarSetName,
	concurrency: number,
) {
	const set = await loadGrammarSet(setsRoot, setName);
	return goldRequests({
		cases: set.cases.map((goldCase) => ({ id: goldCase.id, at: goldCase })),
		oracle: { answers: goldAnswers, written: goldWritten },
		attempt: (goldCase, models) => attempt(goldCase, 0, models),
		concurrency,
	});
}

/** The table's entry for one set and input. */
export function grammarExperiment(setName: GrammarSetName, e2e: boolean) {
	const id = `${grammarRoute}:${setName}${e2e ? ":e2e" : ""}`;
	return {
		id,
		caseCount: () => frozenSetSize(trackedGrammarSetsRoot, setName),
		metrics: grammarMetrics,
		// e2e's units come from the segment lab's cache, which a request diff doesn't read.
		...(e2e
			? {}
			: {
					requests: (args: {
						readonly setsRoot?: string;
						readonly concurrency?: number;
					}) =>
						grammarRequests(
							args.setsRoot ?? trackedGrammarSetsRoot,
							setName,
							args.concurrency ?? 12,
						),
				}),
		async evaluate(args: GrammarEvaluateArgs): Promise<GrammarEvaluated> {
			const root = args.root ?? defaultGrammarRoot;
			const setsRoot = args.setsRoot ?? trackedGrammarSetsRoot;
			if (!isFrozen(setsRoot, setName))
				throw Error(
					`The ${setName} set of ${grammarRoute} is not frozen; run \`bun cli/resolve-grammar.ts freeze\` first`,
				);
			const set = await loadGrammarSet(setsRoot, setName);
			const repetitions = args.repetitions ?? grammarRepetitions;
			if (
				!Number.isInteger(repetitions) ||
				repetitions < 1 ||
				repetitions > grammarRepetitions
			)
				throw Error(
					`repetitions must be 1 to ${grammarRepetitions}, not ${repetitions}`,
				);
			let caseFilter: CaseFilter | undefined;
			let selected = set.cases;
			if (args.subset) {
				const path = resolve(packageRoot, args.subset);
				const subset = loadSubset(path);
				if (subset.setHash !== set.hash)
					throw Error(
						`The subset was read from set ${subset.setHash}, not the frozen ${set.hash}`,
					);
				const ids = subsetCaseIds(subset);
				const wanted = new Set([...ids.missed, ...ids.guard]);
				selected = set.cases.filter(({ id }) => wanted.has(id));
				if (selected.length !== wanted.size)
					throw Error("The subset names cases the frozen set lacks");
				caseFilter = {
					subset: relative(packageRoot, path),
					baselineRunId: subset.baselineRunId,
					seed: subset.seed,
					missed: ids.missed,
					guard: ids.guard,
				};
			}
			const cases = selected.slice(0, args.limit ?? selected.length);
			const concurrency = args.concurrency ?? 12;
			const directory = join(root, "cache");
			const units = e2e
				? await cachedUnits(
						args.segmentLabRoot ?? defaultSegmentLabRoot,
						args.segmentSetsRoot ?? trackedSetsRoot,
					)
				: undefined;
			const identity = { name: set.name, hash: set.hash };
			let price: GrammarPrice | undefined;
			const ledgerSizes =
				args.estimate || !args.offline
					? await readLedgerSizes(
							args.ledger ?? grammarLedgerPath,
							id,
						)
					: undefined;
			let stageSizes: GrammarPrice["sizes"]["stages"] | undefined;
			if (args.estimate || !args.offline) {
				const projecting = new GrammarModels({
					directory,
					mode: "project",
					...(ledgerSizes ? { ledgerSizes } : {}),
					...(args.estimate && args.wholeRound
						? { wholeRound: true }
						: {}),
				});
				await pass(cases, projecting, concurrency, repetitions, units);
				price = projecting.price(
					repetitions,
					cases.length * repetitions,
				);
				stageSizes = price.sizes.stages;
				if (args.estimate) return { price, set: identity };
				await args.beforeLive?.(price);
			}
			const live = new GrammarModels({
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
						"A live resolve.grammar run needs jev and Luna",
					);
				// Staged with a batch: each pass stops attempts at their Luna
				// misses, one batch answers them, and the next pass goes on.
				const signal = args.signal ?? new AbortController().signal;
				await live.resumeLunaBatches(signal);
				await pass(cases, live, concurrency, repetitions, units);
				while (await live.sendLunaBatch(signal))
					await pass(cases, live, concurrency, repetitions, units);
				if (live.capHit !== undefined)
					throw Error(
						`The run stopped at the ${live.capHit}; spent ${JSON.stringify(live.report())}`,
					);
			}
			const replay = new GrammarModels({ directory, mode: "offline" });
			const byId = new Map(
				cases.map((goldCase) => [goldCase.id, goldCase]),
			);
			const corpus = defineGoldenCorpus({
				route: grammarRoute,
				inputSchema,
				outputSchema: grammarOutputSchema,
				collections: {
					dumcorpus: defineGoldenCaseCollection({
						groups: {
							cases: defineGoldenCaseGroup(
								Object.fromEntries(
									cases.map((goldCase) => [
										goldCase.id,
										{
											input: {
												caseId: goldCase.id,
												record: goldCase.record,
												route: routeKey(goldCase),
												rules: [...goldCase.rules],
											} satisfies GrammarInput,
											idealOutput: {
												_tag: "Resolved" as const,
												attestation: goldCase.ideal,
											},
											contaminationKeys: [
												goldCase.record,
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
			const attempts = new Map<string, number>();
			const run = await runOperationExperiment({
				experiment: {
					corpus,
					evaluation: corpus.select(cases.map(({ id }) => id)),
					demonstrations: corpus.select([]),
					// The one traced run adapter: promptsmith runs a case's
					// repetitions back to back and passes no index, so the
					// attempts at one case count off the cache's repetitions.
					run: async (input, context) => {
						const goldCase = byId.get(input.caseId);
						if (!goldCase) throw Error(`No case ${input.caseId}`);
						const repetition = attempts.get(input.caseId) ?? 0;
						attempts.set(input.caseId, repetition + 1);
						const output = await attempt(
							goldCase,
							repetition % repetitions,
							replay,
							units,
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
						const goldCase = byId.get(caseId);
						if (!goldCase) throw Error(`No case ${caseId}`);
						return evaluateGrammar(goldCase.ideal, output);
					},
				},
				experimentId: id,
				operationVersion: `${grammarRoute}${e2e ? ":e2e" : ""}@production`,
				evaluatorVersion: "resolve-grammar-1",
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
