/**
 * The experiments `cli/evaluate.ts` lists and runs, in one table (#701,
 * #845), each with its corpus, its operation behind one traced run adapter,
 * its evaluator and its metrics:
 *
 * - `segment-in-units/de:<set>`, gold mode: a lab set's gold Segments go in
 *   and the production unit stage's units come out, under the operation and
 *   call adapter `createDumgen` builds (`production-segmenter.ts`).
 * - `segment-in-units/de:<set>:raw`, raw mode, the production headline: the
 *   record's Sentence goes into `createDumgen`'s `segment.inUnits`, whose
 *   Segment stage cuts it and whose unit stage groups the Segments
 *   (`segment-in-units-raw.ts`).
 * - `split-text/de:ud-drafts`, text mode: `splitText` cuts the ud-drafts
 *   Texts into Sentences (`split-text.ts`).
 * - `resolve-grammar/de:<set>` and `resolve-grammar/de:dev:e2e`: a click's
 *   grammar against dumcorpus's Attestation gold (#873,
 *   `resolve-grammar/experiment.ts`), with its own frozen sets and cache.
 * - `resolve-reading/de:<set>`: a click's Reading against dumcorpus's
 *   Reading gold, gold's Reading present among the candidates and removed
 *   from them (#873, `resolve-reading/experiment.ts`), with its own frozen
 *   sets and cache. It shares resolve.grammar's transports, budget guard
 *   and caps.
 * - `knowledge/de:dev`, `:heldout` and `:spot-check`: `knowledge.produce`'s
 *   structural aspects against dumcorpus's Knowledge gold, and its text
 *   aspects on a human spot-check sample (#887, `knowledge/experiment.ts`),
 *   with the same transports, guard and caps.
 * - `knowledge/de:doublets:tuning` and `:heldout`: `knowledge.produce`'s
 *   licence judge on the two halves of the German Doublet Rule's gold, a
 *   Lemma's later Reading produced over its other Reading's stored forms
 *   (#1230, #1260, `licence/experiment.ts`), with the Knowledge port's
 *   cache, transports, guard and caps. Prompts are tuned on `tuning`
 *   only.
 *
 * `<set>` is one of the lab's frozen sets, `dev` or `heldout`. Each case
 * runs three times, as in the lab's runs, and jev answers come through the
 * lab's cache (`lab/segmentation/harness/jev-cache.ts`), the transport `createDumgen` is given,
 * so a case the lab has run replays without a call. The cache retries a
 * fresh request that met a rate limit or a server error, which production
 * never does, and the run reports every retry and failure as `transport`.
 * `offline` makes a cache miss fail its case. A live run first prices
 * itself offline (`lab/segmentation/harness/round.ts`), hands the price to `beforeLive`, which
 * may refuse, then fills the cache concurrently and runs from it.
 *
 * This file holds the table and text mode. The segment.inUnits modes and
 * experiments are in `segment-in-units-modes.ts` and
 * `segment-in-units-experiment.ts`, the port entries in `port-entries.ts`,
 * and the shared types in `experiment-types.ts`.
 */
import { canonicalJson, isRecord } from "common-utils";
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
import { splitText } from "../../src/segment/split-text.js";
import type { LabRun } from "../segmentation/harness/run.js";
import type {
	BuiltRequests,
	EvaluateArgs,
	Experiment,
} from "./experiment-types.js";
import {
	knowledgeEntry,
	licenceEntry,
	resolveGrammarEntry,
	resolveReadingEntry,
} from "./port-entries.js";
import {
	segmentInUnitsExperiment,
	setNames,
} from "./segment-in-units-experiment.js";
import { goldMode, rawMode } from "./segment-in-units-modes.js";
import { segmentInUnitsRoute } from "./spec-corpus/segment-in-units.js";
import {
	evaluateSplitText,
	splitTextInputSchema,
	splitTextMetrics,
	splitTextOutputSchema,
	udDraftTexts,
} from "./split-text.js";

export type {
	BuiltRequests,
	EvaluateArgs,
	UnitConfig,
} from "./experiment-types.js";
export { unitConfigs } from "./experiment-types.js";
export { defaultLabRoot } from "./segment-in-units-experiment.js";

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
	licenceEntry("tuning"),
	licenceEntry("heldout"),
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

/** Every case's requests to jev and Luna, built offline (`request-diff.ts`). */
export async function experimentRequests(
	args: EvaluateArgs,
): Promise<BuiltRequests> {
	const { requests } = experimentOf(args.experimentId);
	if (!requests)
		throw Error(
			`${args.experimentId} has no request diff; these do: ${experiments
				.filter((experiment) => experiment.requests)
				.map(({ id }) => id)
				.join(", ")}`,
		);
	return requests(args);
}

/** The rates of a run, read the way its experiment scores. */
export const evaluationMetrics = (run: OperationEvaluationRun) =>
	experimentOf(run.manifest.experimentId).metrics(run);

/**
 * An output's units without the closed-class identity production stores
 * since #864, which no lab run recorded.
 */
const withoutIdentity = (output: unknown): unknown => {
	if (!isRecord(output) || !Array.isArray(output.units)) return output;
	return {
		...output,
		units: output.units.map((unit: unknown) => {
			if (!isRecord(unit)) return unit;
			const { identity: _identity, ...rest } = unit;
			return rest;
		}),
	};
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
				canonicalJson(withoutIdentity(attempt.output ?? null)) ===
				canonicalJson(stored?.outputs?.[policy] ?? null)
			)
				identical++;
			else differing.push(at);
		}
	}
	return { compared, identical, differing, failed, missing };
}
