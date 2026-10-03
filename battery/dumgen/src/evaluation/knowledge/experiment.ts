/**
 * The `knowledge.produce` experiments of the evaluation table (#887, #873),
 * on the patterns `resolve.grammar` and `resolve.reading` set: corpora from
 * the records and the sidecar (`cases.ts`), one traced run adapter, and a
 * disk cache of every answer, so a re-score costs no call.
 *
 * - `knowledge/de:dev` and `:heldout` ask each Reading for the structural
 *   aspects its route applies and score them against gold (`scoring.ts`).
 * - `knowledge/de:spot-check` asks the spot-check set's Readings for the
 *   text aspects and lists a sample per aspect for a human, #545's slips
 *   among them.
 *
 * Each case runs three times, or as many as `repetitions` asks, with
 * `origin` New: the case's Sentence created the Reading. A live run first
 * prices itself (the cache in `project` mode, answering as gold would),
 * hands the price to `beforeLive`, which may refuse, then fills the cache
 * under the round's caps, Luna batched or not, and runs from it.
 */
import { existsSync, readFileSync } from "node:fs";
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
	type KnowledgeCase,
	type KnowledgeScope,
	type KnowledgeSet,
	type KnowledgeSetName,
	knowledgeSetPath,
	loadKnowledgeSet,
	requestOf,
} from "./cases.js";
import { type KnowledgeAttempt, knowledgeOracle } from "./oracle.js";
import {
	evaluateKnowledge,
	type KnowledgeEvaluation,
	type KnowledgeOutput,
	knowledgeOutputSchema,
	knowledgeReport,
	type ScoredKnowledge,
	spotCheckReport,
} from "./scoring.js";
import { knowledgeSubsetCaseIds, loadKnowledgeSubset } from "./subset.js";

/** The package root a subset's path is relative to. */
const packageRoot = fileURLToPath(new URL("../../../", import.meta.url));

export const defaultKnowledgeRoot = fileURLToPath(
	new URL("../../../.runs/knowledge/", import.meta.url),
);

export const knowledgeRoute = "knowledge/de";

/** The port's ledger, whose latest round's sizes price a run (#891). */
const knowledgeLedgerPath = fileURLToPath(
	new URL("../../../evidence/knowledge/ledger.jsonl", import.meta.url),
);

/**
 * What a Knowledge request is priced at before the port's own cache has
 * measured its stages (#891). Input: the tokens per character measured on
 * resolve.reading's cached held-out round on 2026-10-03, the closest
 * prompts in shape (392 Luna requests, 0.2453; 414 jev requests, 0.3653),
 * in place of the characters-per-token constants. Output: each Luna
 * stage's typical answer, an estimate (jev's output is free). A stage the
 * cache has measured three times prices itself instead.
 */
const lunaTokensPerChar = 0.24530701562551255;
const jevTokensPerChar = 0.3652538054900962;
const lunaOutputs: Readonly<Record<string, number>> = {
	transcription: 8,
	definition: 25,
	translations: 8,
	plural: 8,
	conjugationClass: 6,
	valency: 70,
	participleSource: 30,
	attribution: 12,
	relationCandidates: 45,
};
const jevStages = [
	"plurality",
	"participleJudgment",
	"locutionType",
	"sayingType",
	"formulaRole",
	"relationJudgment",
];
export const proxyStageSizes: GrammarPrice["sizes"]["stages"] = {
	...Object.fromEntries(
		Object.entries(lunaOutputs).map(([stage, output]) => [
			`luna:${stage}`,
			{
				samples: 0,
				inputTokensPerChar: lunaTokensPerChar,
				outputTokensPerRequest: output,
			},
		]),
	),
	...Object.fromEntries(
		jevStages.map((stage) => [
			`jev:${stage}`,
			{
				samples: 0,
				inputTokensPerChar: jevTokensPerChar,
				outputTokensPerRequest: 0,
			},
		]),
	),
};

/** Each case runs three times; each repetition is its own cached answer. */
export const knowledgeRepetitions = 3;

/** The operation a run measures. 1: the first port (#887). 2: the text prompts after the first spot-check. */
export const knowledgeOperationVersion = `${knowledgeRoute}@production-6`;

export type KnowledgeEvaluateArgs = {
	readonly experimentId: string;
	readonly sourceRevision: string;
	/** Asked on a cache miss in a live run. */
	readonly jev?: JevAsk;
	readonly luna?: LunaAsk;
	/** Luna's cache misses through OpenAI's Batch API instead of `luna` (#891). */
	readonly lunaBatch?: LunaBatch;
	readonly onLunaBatch?: (event: LunaBatchEvent) => void | Promise<void>;
	/** The ledger whose latest round's sizes price the run; the port's by default. */
	readonly ledger?: string;
	readonly offline?: boolean;
	/** Price the run and stop: nothing is asked and no run is saved. */
	readonly estimate?: boolean;
	/** With `estimate`: price every request, cached ones included. */
	readonly wholeRound?: boolean;
	readonly beforeLive?: (price: GrammarPrice) => void | Promise<void>;
	readonly beforeSpend?: () => void;
	/** The round's hard caps; a live run stops at the first it would cross. */
	readonly caps?: GrammarCaps;
	readonly outputDirectory?: string;
	readonly signal?: AbortSignal;
	readonly concurrency?: number;
	/** The frozen sets and the answer cache; `.runs/knowledge` by default. */
	readonly root?: string;
	/** Only the first this many cases, for a smoke run. */
	readonly limit?: number;
	/** Fewer repetitions than three, for a cheaper round. */
	readonly repetitions?: number;
	/** Only the cases with gold Knowledge: dev's drafted Readings (#887 ruling 1). */
	readonly goldOnly?: boolean;
	/** A frozen subset's file (`subset.ts`): only its cases run. */
	readonly subset?: string;
};

export type KnowledgeEvaluated = {
	readonly run?: OperationEvaluationRun;
	readonly price?: GrammarPrice;
	readonly spend?: ModelsSpend;
	readonly set?: { readonly name: KnowledgeSetName; readonly hash: string };
};

/** `knowledge.produce`'s cached transports, its projections answered from gold. */
export class KnowledgeModels extends CachedModels<KnowledgeAttempt> {
	constructor(options: GrammarModelsOptions) {
		super(options, knowledgeOracle);
	}
}

/** What an attempt gives the run: its case and what the metrics read. */
const inputSchema = z.object({
	caseId: z.string(),
	record: z.string(),
	route: z.string(),
	lemma: z.string(),
	emojiDescription: z.string(),
	markedSentence: z.string(),
	scope: z.enum(["structural", "text"]),
	gold: z.boolean(),
	authored: z.boolean(),
});
type KnowledgeInput = z.infer<typeof inputSchema>;

const routeKey = (goldCase: KnowledgeCase) =>
	`${goldCase.reading.lemma.family}/${goldCase.reading.lemma.kind}`;

const emojiOf = (goldCase: KnowledgeCase) =>
	(goldCase.reading as { emojiDescription?: string }).emojiDescription ?? "";

/** The set an experiment runs and the aspects it asks for. */
const scopeOf = (setName: KnowledgeSetName): KnowledgeScope =>
	setName === "spot-check" ? "text" : "structural";

/** One run of `knowledge.produce` on a case, as a run stores it. */
async function attempt(
	goldCase: KnowledgeCase,
	scope: KnowledgeScope,
	repetition: number,
	models: KnowledgeModels,
): Promise<KnowledgeOutput> {
	const traces: OperationTrace[] = [];
	const at: KnowledgeAttempt = { goldCase, scope };
	const result = await Effect.runPromise(
		createDumgen({
			jev: models.jev(at, repetition),
			luna: models.luna(at, repetition),
			onOperation: (trace) => traces.push(trace),
		}).knowledge.produce({
			language: "de",
			reading: goldCase.reading,
			attestation: goldCase.attestation,
			sentence: goldCase.sentence,
			origin: "New",
			request: requestOf(goldCase, scope),
		}),
	);
	// A run cut short by a batch hold or a cap has no answer to score.
	const held = result.failures.find(({ message }) =>
		/held for the run's next batch|Stopped at the|cache miss in offline mode/u.test(
			message,
		),
	);
	if (held) throw Error(held.message);
	return {
		changes: [...result.changes],
		pendingRelations: result.pendingRelations.map(
			({ relation, target }) => ({
				relation,
				target: { ...target },
			}),
		),
		failures: result.failures.map((failure) => ({ ...failure })),
		...(traces[0]?.events
			? {
					events: traces[0].events.map(({ name, data }) => ({
						name,
						data: data ?? null,
					})),
				}
			: {}),
	};
}

/** Every case's every repetition, `concurrency` at a time; failures are left for the run. */
async function pass(
	cases: readonly KnowledgeCase[],
	scope: KnowledgeScope,
	models: KnowledgeModels,
	concurrency: number,
	repetitions: number,
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
						scope,
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

/** The scored attempts of a run, one per case and repetition. */
export function knowledgeAttempts(
	run: OperationEvaluationRun,
): ScoredKnowledge[] {
	return run.cases.flatMap((record) => {
		const input = inputSchema.parse(record.input);
		return (record.repetitions ?? [record]).map((repetition, index) => ({
			caseId: input.caseId,
			repetition: index,
			route: input.route,
			lemma: input.lemma,
			emojiDescription: input.emojiDescription,
			sentence: input.markedSentence,
			evaluation: repetition.evaluation as
				| KnowledgeEvaluation
				| undefined,
		}));
	});
}

/** The report of a run: the structural lines, or the text spot-check. */
export function knowledgeMetrics(run: OperationEvaluationRun) {
	const attempts = knowledgeAttempts(run);
	const settings = run.manifest.configurations.judgment.settings as {
		set?: string;
		slips?: KnowledgeSet["slips"];
	};
	return settings.set === "spot-check"
		? spotCheckReport(attempts, settings.slips ?? [])
		: knowledgeReport(attempts);
}

/** The table's entry for one set. */
export function knowledgeExperiment(setName: KnowledgeSetName) {
	const id = `${knowledgeRoute}:${setName}`;
	const scope = scopeOf(setName);
	return {
		id,
		caseCount: () => {
			const path = knowledgeSetPath(defaultKnowledgeRoot, setName);
			if (!existsSync(path)) return 0;
			return (
				JSON.parse(readFileSync(path, "utf8")) as { cases: unknown[] }
			).cases.length;
		},
		metrics: knowledgeMetrics,
		async evaluate(
			args: KnowledgeEvaluateArgs,
		): Promise<KnowledgeEvaluated> {
			const root = args.root ?? defaultKnowledgeRoot;
			if (!existsSync(knowledgeSetPath(root, setName)))
				throw Error(
					`The ${setName} set of ${knowledgeRoute} is not frozen; run \`bun cli/knowledge.ts freeze\` first`,
				);
			const set = await loadKnowledgeSet(root, setName);
			const repetitions = args.repetitions ?? knowledgeRepetitions;
			if (
				!Number.isInteger(repetitions) ||
				repetitions < 1 ||
				repetitions > knowledgeRepetitions
			)
				throw Error(
					`repetitions must be 1 to ${knowledgeRepetitions}, not ${repetitions}`,
				);
			const subset = args.subset
				? loadKnowledgeSubset(resolve(packageRoot, args.subset))
				: undefined;
			if (subset && subset.setHash !== set.hash)
				throw Error(
					`The subset ${args.subset} was drawn from ${setName}@${subset.setHash}, not the frozen ${set.hash}`,
				);
			const subsetIds = subset
				? new Set(Object.values(knowledgeSubsetCaseIds(subset)).flat())
				: undefined;
			// tf-demo attaches an authored Reading's Knowledge; nothing to ask.
			const runnable = set.cases.filter(
				(goldCase) =>
					!goldCase.authored &&
					(!args.goldOnly || goldCase.gold !== undefined) &&
					(!subsetIds || subsetIds.has(goldCase.id)),
			);
			const cases = runnable.slice(0, args.limit ?? runnable.length);
			const concurrency = args.concurrency ?? 12;
			const directory = join(root, "cache");
			const identity = { name: set.name, hash: set.hash };
			let price: GrammarPrice | undefined;
			const ledgerSizes =
				args.estimate || !args.offline
					? await readLedgerSizes(
							args.ledger ?? knowledgeLedgerPath,
							id,
						)
					: undefined;
			let stageSizes: GrammarPrice["sizes"]["stages"] | undefined;
			if (args.estimate || !args.offline) {
				const projecting = new KnowledgeModels({
					directory,
					mode: "project",
					stageSizes: proxyStageSizes,
					...(ledgerSizes ? { ledgerSizes } : {}),
					...(args.estimate && args.wholeRound
						? { wholeRound: true }
						: {}),
				});
				await pass(cases, scope, projecting, concurrency, repetitions);
				price = projecting.price(
					repetitions,
					cases.length * repetitions,
				);
				stageSizes = price.sizes.stages;
				if (args.estimate) return { price, set: identity };
				await args.beforeLive?.(price);
			}
			const live = new KnowledgeModels({
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
						"A live knowledge.produce run needs jev and Luna",
					);
				const signal = args.signal ?? new AbortController().signal;
				await live.resumeLunaBatches(signal);
				await pass(cases, scope, live, concurrency, repetitions);
				while (await live.sendLunaBatch(signal))
					await pass(cases, scope, live, concurrency, repetitions);
				if (live.capHit !== undefined)
					throw Error(
						`The run stopped at the ${live.capHit}; spent ${JSON.stringify(live.report())}`,
					);
			}
			const replay = new KnowledgeModels({ directory, mode: "offline" });
			const byId = new Map(
				cases.map((goldCase) => [goldCase.id, goldCase]),
			);
			const corpus = defineGoldenCorpus({
				route: knowledgeRoute,
				inputSchema,
				outputSchema: knowledgeOutputSchema,
				collections: {
					dumspec: defineGoldenCaseCollection(
						`knowledge:${set.name}@${set.hash}`,
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
													lemma: goldCase.reading
														.lemma.canonicalForm,
													emojiDescription:
														emojiOf(goldCase),
													markedSentence:
														markedSentence(
															goldCase.sentence
																.segments,
															goldCase.sentence
																.target,
														),
													scope,
													gold:
														goldCase.gold !==
														undefined,
													authored: goldCase.authored,
												} satisfies KnowledgeInput,
												idealOutput: {
													changes: [],
													pendingRelations: [],
													failures: [],
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
			const repetitionsSeen = new Map<string, number>();
			const run = await runOperationExperiment({
				experiment: {
					corpus,
					evaluation: corpus.select([...byId.keys()]),
					demonstrations: corpus.select([]),
					// The one traced run adapter: promptsmith runs a case's
					// repetitions back to back and passes no index, so they
					// count off the cache's repetitions.
					run: async (input, context) => {
						const goldCase = byId.get(input.caseId);
						if (!goldCase) throw Error(`No case ${input.caseId}`);
						const repetition =
							repetitionsSeen.get(input.caseId) ?? 0;
						repetitionsSeen.set(input.caseId, repetition + 1);
						const output = await attempt(
							goldCase,
							scope,
							repetition % repetitions,
							replay,
						);
						context.recordTrace({ calls: [] });
						return output;
					},
					evaluator: ({ caseId, output }) => {
						const goldCase = byId.get(caseId);
						if (!goldCase) throw Error(`No case ${caseId}`);
						return evaluateKnowledge(
							goldCase,
							requestOf(goldCase, scope),
							output,
						);
					},
				},
				experimentId: id,
				operationVersion: knowledgeOperationVersion,
				evaluatorVersion: "knowledge-1",
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
						settings: JSON.parse(
							JSON.stringify({
								set: set.name,
								setHash: set.hash,
								scope,
								...(args.goldOnly ? { goldOnly: true } : {}),
								...(subset && args.subset
									? {
											subset: {
												path: args.subset,
												baselineRunId:
													subset.baselineRunId,
												seed: subset.seed,
												guardSize: subset.guardSize,
											},
										}
									: {}),
								...(set.slips ? { slips: set.slips } : {}),
							}),
						),
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
