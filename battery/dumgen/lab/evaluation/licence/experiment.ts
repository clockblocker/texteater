/**
 * `knowledge/de:doublets:tuning` and `:heldout`, the licence judge's
 * experiments (#1230, #1260), on the pattern `knowledge/de:<set>` sets: a
 * frozen set (`cases.ts`) split into two halves (`doubletSplitOf`), one
 * traced run adapter, and the Knowledge port's disk cache, so a re-score
 * costs no call. Prompts are tuned on `tuning` only; `heldout` reports.
 *
 * Each case runs `knowledge.produce` for its later Reading, `origin` New,
 * with every Variation Dimension its route names and the stored Reading's
 * gold forms as the Lemma's stored Paradigm: Luna's write, then the
 * judge's one request for the dimensions whose forms differ from the
 * stored ones. It runs three times, or as many as `repetitions` asks. A
 * live run first prices itself (the cache in `project` mode, answering as
 * gold would), hands the price to `beforeLive`, which may refuse, then
 * fills the cache under the round's caps and runs from it.
 */
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { paradigmDimensions } from "dumrel";
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
import { DumgenLive } from "../../../src/dumgen-live.js";
import { JevTransport } from "../../../src/jev-call.js";
import { defaultLunaConfiguration } from "../../../src/luna.js";
import { LunaTransport } from "../../../src/luna-call.js";
import type { OperationTrace } from "../../../src/operation-trace.js";
import { operations } from "../../../src/operations.js";
import { markedSentence } from "../../../src/resolve/reading.js";
import { pinnedJevModel } from "../../../src/segment/jev.js";
import { storedAs } from "../../stored-json.js";
import type {
	KnowledgeEvaluateArgs,
	KnowledgeEvaluated,
} from "../knowledge/experiment.js";
import { goldRequests } from "../request-diff.js";
import {
	CachedModels,
	type GrammarModelsOptions,
	type GrammarPrice,
} from "../resolve-grammar/models.js";
import {
	fillLive,
	openFrozenSet,
	priceRound,
	runModelsOptions,
} from "../round-steps.js";
import {
	type DoubletSplit,
	frozenSplitCases,
	type LicenceCase,
	licenceFreezeCommand,
	loadLicenceSet,
	splitCases,
	storedParadigmOf,
	trackedLicenceSetsRoot,
} from "./cases.js";
import { type LicenceAttempt, licenceOracle } from "./oracle.js";
import {
	evaluateLicence,
	type LicenceOutput,
	licenceEvaluationSchema,
	licenceOutputSchema,
	licenceReport,
	type ScoredLicence,
} from "./scoring.js";

const defaultRoot = fileURLToPath(
	new URL("../../../.runs/knowledge/", import.meta.url),
);

const route = "knowledge/de";

/** The Knowledge port's ledger, whose latest round's sizes price a run (#891). */
const ledgerPath = fileURLToPath(
	new URL("../../../evidence/knowledge/ledger.jsonl", import.meta.url),
);

/**
 * What a request is priced at before the cache has measured its stages:
 * the Knowledge experiment's tokens per character (resolve.reading's
 * held-out round on 2026-10-03) and its typical Luna answers.
 */
const stageSizes: GrammarPrice["sizes"]["stages"] = {
	"jev:paradigmLicence": {
		samples: 0,
		inputTokensPerChar: 0.3652538054900962,
		outputTokensPerRequest: 0,
	},
	"jev:plurality": {
		samples: 0,
		inputTokensPerChar: 0.3652538054900962,
		outputTokensPerRequest: 0,
	},
	"luna:plural": {
		samples: 0,
		inputTokensPerChar: 0.24530701562551255,
		outputTokensPerRequest: 8,
	},
	"luna:verbForms": {
		samples: 0,
		inputTokensPerChar: 0.24530701562551255,
		outputTokensPerRequest: 45,
	},
};

const maximumRepetitions = 3;

/**
 * The operation a run measures. 1: one Noul per stored variant, taken at
 * 0.5 (#1230 round 1). 2: the policy says the stored forms are another
 * meaning's, and the Noul's yes and no name the meaning, not the form's
 * correctness (round 2). 3: one Choice per dimension over every selection
 * of its stored variants (round 3, dropped: it scored below round 2). 4:
 * round 2's Nouls, taken at 0.6. 5: Luna writes first; a dimension whose
 * forms differ from the stored ones goes to one Choice over every
 * selection of the stored and new forms together (#1260).
 */
const operationVersion = `${route}@licence-5`;

/**
 * The evaluator. 1: the judge per dimension and variant, and the Licences
 * runs end with (#1230). 2: the Licence the run leaves against gold's
 * forms, with Luna's forms, matched and judged dimensions read apart, and
 * the judge requests per attempt (#1260).
 */
const evaluatorVersion = "licence-2";

class LicenceModels extends CachedModels<LicenceAttempt> {
	constructor(options: GrammarModelsOptions) {
		super(options, licenceOracle);
	}
}

const inputSchema = z.object({
	caseId: z.string(),
	lemma: z.string(),
	control: z.boolean(),
	later: z.string(),
	stored: z.string(),
	markedSentence: z.string(),
});
type LicenceInput = z.infer<typeof inputSchema>;

const emojiOf = (reading: LicenceCase["stored"]["reading"]) =>
	"emojiDescription" in reading ? reading.emojiDescription : "";

/** One run of `knowledge.produce` on a case, as a run stores it. */
async function attempt(
	licenceCase: LicenceCase,
	repetition: number,
	models: Pick<LicenceModels, "jev" | "luna">,
): Promise<LicenceOutput> {
	const traces: OperationTrace[] = [];
	const at: LicenceAttempt = { licenceCase };
	const { later, stored } = licenceCase;
	const result = await Effect.runPromise(
		operations.knowledge
			.produce({
				language: "de",
				reading: later.reading,
				attestation: later.attestation,
				sentence: later.sentence,
				origin: "New",
				request: {},
				paradigm: {
					dimensions: paradigmDimensions(later.reading.lemma),
					stored: storedParadigmOf(licenceCase),
					readings: [stored.reading],
				},
			})
			.pipe(
				Effect.provide(
					DumgenLive({
						jev: JevTransport.fromAsk(models.jev(at, repetition)),
						luna: LunaTransport.fromAsk(
							models.luna(at, repetition),
						),
						onOperation: (trace) => traces.push(trace),
					}),
				),
			),
	);
	// A run cut short by a batch hold or a cap has no answer to score.
	const held = result.failures.find(({ message }) =>
		/held for the run's next batch|Stopped at the|cache miss in offline mode/u.test(
			message,
		),
	);
	if (held) throw Error(held.message);
	return {
		paradigmChanges: [...result.paradigmChanges],
		failures: result.failures.map(({ aspect, code, message }) => ({
			aspect,
			code,
			message,
		})),
		events: (traces[0]?.events ?? []).map(({ name, data }) => ({
			name,
			data: data ?? null,
		})),
	};
}

/** Every case's every repetition, `concurrency` at a time; failures are left for the run. */
async function pass(
	cases: readonly LicenceCase[],
	models: LicenceModels,
	concurrency: number,
	repetitions: number,
): Promise<void> {
	const work = cases.flatMap((licenceCase) =>
		Array.from({ length: repetitions }, (_, repetition) => ({
			licenceCase,
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
					await attempt(item.licenceCase, item.repetition, models);
				} catch {
					// The run records the failure.
				}
			}
		}),
	);
}

/**
 * One half's requests to jev and Luna (`request-diff.ts`): each case a run
 * would ask once, Luna writing and the judge choosing as gold would, so
 * the requests and the outcome are fixed.
 */
async function licenceRequests(
	setsRoot: string,
	split: DoubletSplit,
	concurrency: number,
) {
	const set = await loadLicenceSet(setsRoot);
	return goldRequests({
		cases: splitCases(set.cases, split).map((licenceCase) => ({
			id: licenceCase.id,
			at: { licenceCase },
		})),
		oracle: licenceOracle,
		attempt: (at, models) => attempt(at.licenceCase, 0, models),
		concurrency,
	});
}

/** The scored attempts of a run, one per case and repetition. */
function licenceAttempts(run: OperationEvaluationRun): ScoredLicence[] {
	return run.cases.flatMap((record) => {
		const input = inputSchema.parse(record.input);
		return (record.repetitions ?? [record]).map((repetition, index) => ({
			caseId: input.caseId,
			repetition: index,
			lemma: input.lemma,
			control: input.control,
			evaluation:
				repetition.evaluation === undefined
					? undefined
					: storedAs(
							licenceEvaluationSchema,
							repetition.evaluation,
							`Run ${run.manifest.runId}'s evaluation of ${input.caseId}`,
						),
		}));
	});
}

export const licenceMetrics = (run: OperationEvaluationRun) =>
	licenceReport(licenceAttempts(run));

/** What a doublets run takes: the Knowledge experiment's arguments, but no subset or gold filter. */
export type LicenceEvaluateArgs = Omit<
	KnowledgeEvaluateArgs,
	"subset" | "goldOnly"
>;

export type LicenceEvaluated = Omit<KnowledgeEvaluated, "set"> & {
	readonly set?: { readonly name: "doublets"; readonly hash: string };
};

/** The table's entry for one half of the doublets set. */
export function licenceExperiment(split: DoubletSplit) {
	const experimentId = `${route}:doublets:${split}`;
	return {
		id: experimentId,
		caseCount: () => frozenSplitCases(trackedLicenceSetsRoot, split).length,
		metrics: licenceMetrics,
		requests: (args: {
			readonly setsRoot?: string;
			readonly concurrency?: number;
		}) =>
			licenceRequests(
				args.setsRoot ?? trackedLicenceSetsRoot,
				split,
				args.concurrency ?? 12,
			),
		async evaluate(args: LicenceEvaluateArgs): Promise<LicenceEvaluated> {
			const directory = join(args.root ?? defaultRoot, "cache");
			const { set, repetitions } = await openFrozenSet({
				setsRoot: args.setsRoot ?? trackedLicenceSetsRoot,
				setName: "doublets" as const,
				route,
				freezeCommand: licenceFreezeCommand,
				load: loadLicenceSet,
				maximum: maximumRepetitions,
				repetitions: args.repetitions,
			});
			const half = splitCases(set.cases, split);
			const cases = half.slice(0, args.limit ?? half.length);
			const concurrency = args.concurrency ?? 12;
			const passWith = (models: LicenceModels) =>
				pass(cases, models, concurrency, repetitions);
			const priced = await priceRound(args, {
				id: experimentId,
				ledger: ledgerPath,
				directory,
				stageSizes,
				models: (options) => new LicenceModels(options),
				pass: passWith,
				repetitions,
				attempts: cases.length * repetitions,
			});
			const { price } = priced;
			const identity = { name: set.name, hash: set.hash };
			if (args.estimate)
				return { ...(price ? { price } : {}), set: identity };
			const live = new LicenceModels(
				runModelsOptions(args, directory, priced),
			);
			await fillLive(args, live, "knowledge.produce", () =>
				passWith(live),
			);
			const replay = new LicenceModels({ directory, mode: "offline" });
			const byId = new Map(cases.map((entry) => [entry.id, entry]));
			const corpus = defineGoldenCorpus({
				route,
				inputSchema,
				outputSchema: licenceOutputSchema,
				collections: {
					dumcorpus: defineGoldenCaseCollection({
						groups: {
							cases: defineGoldenCaseGroup(
								Object.fromEntries(
									cases.map((entry) => [
										entry.id,
										{
											input: {
												caseId: entry.id,
												lemma: entry.lemma,
												control: entry.control,
												later: emojiOf(
													entry.later.reading,
												),
												stored: emojiOf(
													entry.stored.reading,
												),
												markedSentence: markedSentence(
													entry.later.sentence
														.segments,
													entry.later.sentence.target,
												),
											} satisfies LicenceInput,
											idealOutput: {
												paradigmChanges: [],
												failures: [],
												events: [],
											},
											contaminationKeys: [
												entry.later.record,
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
			const repetitionsSeen = new Map<string, number>();
			const run = await runOperationExperiment({
				experiment: {
					corpus,
					evaluation: corpus.select([...byId.keys()]),
					demonstrations: corpus.select([]),
					// promptsmith runs a case's repetitions back to back and
					// passes no index, so they count off the cache's.
					run: async (input, context) => {
						const entry = byId.get(input.caseId);
						if (!entry) throw Error(`No case ${input.caseId}`);
						const repetition =
							repetitionsSeen.get(input.caseId) ?? 0;
						repetitionsSeen.set(input.caseId, repetition + 1);
						const output = await attempt(
							entry,
							repetition % repetitions,
							replay,
						);
						context.recordTrace({ calls: [] });
						return output;
					},
					evaluator: ({ caseId, output }) => {
						const entry = byId.get(caseId);
						if (!entry) throw Error(`No case ${caseId}`);
						return evaluateLicence(entry, output);
					},
				},
				experimentId,
				operationVersion,
				evaluatorVersion,
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
						settings: { set: set.name, setHash: set.hash, split },
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
