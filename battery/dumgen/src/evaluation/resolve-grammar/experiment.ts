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
 * Each case runs three times. A live run first prices itself (`models.ts`
 * in `project` mode), hands the price to `beforeLive`, which may refuse,
 * then fills the cache concurrently and runs from it.
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
	runOperationExperiment,
} from "promptsmith/evaluation";
import { saveRun } from "promptsmith/storage";
import { z } from "zod";
import { createDumgen } from "../../create-dumgen.js";
import { defaultLunaConfiguration, type LunaAsk } from "../../luna.js";
import type { OperationTrace } from "../../operation-trace.js";
import { segmentGermanUnits } from "../../segment/de/units.js";
import { type JevAsk, pinnedJevModel } from "../../segment/jev.js";
import type { Unit } from "../../segment/segmented-sentence.js";
import { askOf } from "../../segment-in-units/de/arm.js";
import { loadSet } from "../../segment-in-units/lab/corpus.js";
import { type CallRecord, Jev } from "../../segment-in-units/lab/jev.js";
import {
	type GrammarCase,
	type GrammarSetName,
	grammarSetPath,
	loadGrammarSet,
} from "./cases.js";
import {
	type ExecutorProjection,
	type ExecutorSpend,
	GrammarModels,
} from "./models.js";
import {
	evaluateGrammar,
	type GrammarOutput,
	grammarOutputSchema,
	grammarReport,
	lineOf,
	type ScoredAttempt,
} from "./scoring.js";

export const defaultGrammarRoot = fileURLToPath(
	new URL("../../../.runs/resolve-grammar/", import.meta.url),
);
const defaultSegmentLabRoot = fileURLToPath(
	new URL("../../../.runs/segment-in-units-lab/", import.meta.url),
);

export const grammarRoute = "resolve-grammar/de";
/** Each case runs three times; each repetition is its own cached answer. */
export const grammarRepetitions = 3;

/** A run's projected spend, per repetition and in all. */
export type GrammarPrice = {
	readonly repetitions: number;
	readonly attempts: number;
	readonly jev: ExecutorProjection;
	readonly luna: ExecutorProjection;
};

export type GrammarEvaluateArgs = {
	readonly experimentId: string;
	readonly sourceRevision: string;
	/** Asked on a cache miss in a live run. */
	readonly jev?: JevAsk;
	readonly luna?: LunaAsk;
	readonly offline?: boolean;
	/** Price the run and stop: nothing is asked and no run is saved. */
	readonly estimate?: boolean;
	readonly beforeLive?: (price: GrammarPrice) => void | Promise<void>;
	readonly beforeSpend?: () => void;
	readonly outputDirectory?: string;
	readonly signal?: AbortSignal;
	readonly concurrency?: number;
	/** The frozen sets and the answer cache; `.runs/resolve-grammar` by default. */
	readonly root?: string;
	/** The segment.inUnits lab whose cached answers the end-to-end line replays. */
	readonly segmentLabRoot?: string;
	/** Only these cases, for a smoke run; all by default. */
	readonly limit?: number;
};

export type GrammarEvaluated = {
	readonly run?: OperationEvaluationRun;
	readonly price?: GrammarPrice;
	readonly spend?: {
		readonly jev: ExecutorSpend;
		readonly luna: ExecutorSpend;
	};
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
	models: GrammarModels,
	units?: UnitSource,
): Promise<GrammarOutput> {
	let unit = goldCase.unit;
	if (units) {
		const produced = await units(goldCase, repetition);
		const match = produced?.find(
			(candidate) =>
				stableJson(candidate.segments) ===
					stableJson(goldCase.unit.segments) &&
				stableJson(candidate.route) === stableJson(goldCase.unit.route),
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
	units?: UnitSource,
): Promise<void> {
	const work = cases.flatMap((goldCase) =>
		Array.from({ length: grammarRepetitions }, (_, repetition) => ({
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
async function cachedUnits(labRoot: string): Promise<UnitSource> {
	const set = await loadSet(labRoot, "dev");
	const byRecord = new Map(
		set.cases.map((labCase) => [labCase.record, labCase]),
	);
	const jev = new Jev({
		cacheDirectory: join(labRoot, "cache"),
		offline: true,
	});
	const memo = new Map<string, Promise<readonly Unit[] | undefined>>();
	return (goldCase, repetition) => {
		const key = `${goldCase.record}#${repetition}`;
		let units = memo.get(key);
		if (!units) {
			const labCase = byRecord.get(goldCase.record);
			const calls: CallRecord[] = [];
			units = labCase
				? Effect.runPromise(
						segmentGermanUnits(
							{ segments: labCase.input.segments },
							askOf({ jev, repetition, calls }),
						),
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
			evaluation: repetition.evaluation as ScoredAttempt["evaluation"],
		}));
	});
}

/**
 * The headline report of a run. The end-to-end line scores only the units
 * that matched gold and says how many did.
 */
export function grammarMetrics(run: OperationEvaluationRun) {
	const attempts = grammarAttempts(run);
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
	};
}

/** The table's entry for one set and input. */
export function grammarExperiment(setName: GrammarSetName, e2e: boolean) {
	const id = `${grammarRoute}:${setName}${e2e ? ":e2e" : ""}`;
	return {
		id,
		caseCount: () => {
			const path = grammarSetPath(defaultGrammarRoot, setName);
			if (!existsSync(path)) return 0;
			return (
				JSON.parse(readFileSync(path, "utf8")) as { cases: unknown[] }
			).cases.length;
		},
		metrics: grammarMetrics,
		async evaluate(args: GrammarEvaluateArgs): Promise<GrammarEvaluated> {
			const root = args.root ?? defaultGrammarRoot;
			if (!existsSync(grammarSetPath(root, setName)))
				throw Error(
					`The ${setName} set of ${grammarRoute} is not frozen; run \`bun cli/resolve-grammar.ts freeze\` first`,
				);
			const set = await loadGrammarSet(root, setName);
			const cases = set.cases.slice(0, args.limit ?? set.cases.length);
			const concurrency = args.concurrency ?? 12;
			const directory = join(root, "cache");
			const units = e2e
				? await cachedUnits(
						args.segmentLabRoot ?? defaultSegmentLabRoot,
					)
				: undefined;
			const identity = { name: set.name, hash: set.hash };
			let price: GrammarPrice | undefined;
			if (args.estimate || !args.offline) {
				const projecting = new GrammarModels({
					directory,
					mode: "project",
				});
				await pass(cases, projecting, concurrency, units);
				price = {
					repetitions: grammarRepetitions,
					attempts: cases.length * grammarRepetitions,
					...projecting.projection,
				};
				if (args.estimate) return { price, set: identity };
				await args.beforeLive?.(price);
			}
			const live = new GrammarModels({
				directory,
				mode: args.offline ? "offline" : "live",
				...(args.jev ? { jev: args.jev } : {}),
				...(args.luna ? { luna: args.luna } : {}),
				...(args.beforeSpend ? { beforeSpend: args.beforeSpend } : {}),
			});
			if (!args.offline) {
				if (!args.jev || !args.luna)
					throw Error(
						"A live resolve.grammar run needs jev and Luna",
					);
				await pass(cases, live, concurrency, units);
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
					dumspec: defineGoldenCaseCollection(
						`resolve-grammar:${set.name}@${set.hash}${e2e ? ":e2e" : ""}`,
						{
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
						},
					),
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
							repetition % grammarRepetitions,
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
						settings: { set: set.name, setHash: set.hash },
					},
				},
				repetitions: grammarRepetitions,
				...(args.signal ? { signal: args.signal } : {}),
			});
			if (args.outputDirectory) await saveRun(args.outputDirectory, run);
			return {
				run,
				...(price ? { price } : {}),
				spend: live.spend,
				set: identity,
			};
		},
	};
}
