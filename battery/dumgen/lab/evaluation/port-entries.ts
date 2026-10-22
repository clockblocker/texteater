/**
 * The evaluation table's entries for resolve.grammar, resolve.reading and
 * knowledge.produce (`experiments.ts`): each passes the table's arguments
 * to its port's experiment, with the transports, price guard and caps
 * resolve.grammar's runs take.
 */
import type { EvaluateArgs, Experiment } from "./experiment-types.js";
import {
	type KnowledgeEvaluated,
	knowledgeExperiment,
} from "./knowledge/experiment.js";
import type { DoubletSplit } from "./licence/cases.js";
import {
	type LicenceEvaluated,
	licenceExperiment,
} from "./licence/experiment.js";
import { grammarExperiment } from "./resolve-grammar/experiment.js";
import { readingExperiment } from "./resolve-reading/experiment.js";

/** A resolve.grammar entry, its arguments taken from the table's. */
export function resolveGrammarEntry(
	set: "dev" | "heldout",
	e2e: boolean,
): Experiment {
	const experiment = grammarExperiment(set, e2e);
	const { requests } = experiment;
	return {
		id: experiment.id,
		caseCount: experiment.caseCount,
		metrics: experiment.metrics,
		...(requests
			? {
					requests: (args: EvaluateArgs) =>
						requests({
							...(args.grammarSetsRoot
								? { setsRoot: args.grammarSetsRoot }
								: {}),
							...(args.concurrency
								? { concurrency: args.concurrency }
								: {}),
							...(args.runtime ? { runtime: args.runtime } : {}),
						}),
				}
			: {}),
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
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
				...(args.runtime ? { runtime: args.runtime } : {}),
				...(args.concurrency ? { concurrency: args.concurrency } : {}),
				...(args.grammarRoot ? { root: args.grammarRoot } : {}),
				...(args.grammarSetsRoot
					? { setsRoot: args.grammarSetsRoot }
					: {}),
				...(args.labRoot ? { segmentLabRoot: args.labRoot } : {}),
				...(args.setsRoot ? { segmentSetsRoot: args.setsRoot } : {}),
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
export function resolveReadingEntry(set: "dev" | "heldout"): Experiment {
	const experiment = readingExperiment(set);
	return {
		id: experiment.id,
		caseCount: experiment.caseCount,
		metrics: experiment.metrics,
		requests: (args) =>
			experiment.requests({
				...(args.readingSetsRoot
					? { setsRoot: args.readingSetsRoot }
					: {}),
				...(args.concurrency ? { concurrency: args.concurrency } : {}),
				...(args.runtime ? { runtime: args.runtime } : {}),
			}),
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
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
				...(args.runtime ? { runtime: args.runtime } : {}),
				...(args.concurrency ? { concurrency: args.concurrency } : {}),
				...(args.readingRoot ? { root: args.readingRoot } : {}),
				...(args.readingSetsRoot
					? { setsRoot: args.readingSetsRoot }
					: {}),
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
 * The table's arguments as a knowledge.produce experiment takes them:
 * the transports, price guard and caps resolve.grammar's runs take.
 */
function knowledgeArgs(args: EvaluateArgs) {
	return {
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
		...(args.runtime ? { runtime: args.runtime } : {}),
		...(args.concurrency ? { concurrency: args.concurrency } : {}),
		...(args.knowledgeRoot ? { root: args.knowledgeRoot } : {}),
		...(args.knowledgeSetsRoot ? { setsRoot: args.knowledgeSetsRoot } : {}),
		...(args.limit ? { limit: args.limit } : {}),
		...(args.repetitions ? { repetitions: args.repetitions } : {}),
		...(args.grammarCaps ? { caps: args.grammarCaps } : {}),
	};
}

/** What a knowledge.produce run gives the table. */
const knowledgeEvaluated = (
	evaluated: KnowledgeEvaluated | LicenceEvaluated,
) => ({
	...(evaluated.run ? { run: evaluated.run } : {}),
	...(evaluated.price ? { price: evaluated.price } : {}),
	...(evaluated.spend ? { grammarSpend: evaluated.spend } : {}),
	...(evaluated.set ? { set: evaluated.set } : {}),
});

/** A knowledge.produce entry, its arguments taken from the table's. */
export function knowledgeEntry(
	set: "dev" | "heldout" | "spot-check",
): Experiment {
	const experiment = knowledgeExperiment(set);
	return {
		id: experiment.id,
		caseCount: experiment.caseCount,
		metrics: experiment.metrics,
		requests: (args) =>
			experiment.requests({
				...(args.knowledgeSetsRoot
					? { setsRoot: args.knowledgeSetsRoot }
					: {}),
				...(args.concurrency ? { concurrency: args.concurrency } : {}),
				...(args.runtime ? { runtime: args.runtime } : {}),
			}),
		async evaluate(args) {
			return knowledgeEvaluated(
				await experiment.evaluate({
					...knowledgeArgs(args),
					...(args.goldOnly ? { goldOnly: true } : {}),
					...(args.grammarSubset
						? { subset: args.grammarSubset }
						: {}),
				}),
			);
		},
	};
}

/**
 * The licence judge's entry for one half of the doublets set (#1230,
 * #1260): the Knowledge arguments, the set holding no subset and every
 * case gold.
 */
export function licenceEntry(split: DoubletSplit): Experiment {
	const experiment = licenceExperiment(split);
	return {
		id: experiment.id,
		caseCount: experiment.caseCount,
		metrics: experiment.metrics,
		requests: (args) =>
			experiment.requests({
				...(args.knowledgeSetsRoot
					? { setsRoot: args.knowledgeSetsRoot }
					: {}),
				...(args.concurrency ? { concurrency: args.concurrency } : {}),
				...(args.runtime ? { runtime: args.runtime } : {}),
			}),
		async evaluate(args) {
			if (args.goldOnly || args.grammarSubset)
				throw Error(
					`${experiment.id} takes no --gold-only or --subset: every case has gold`,
				);
			return knowledgeEvaluated(
				await experiment.evaluate(knowledgeArgs(args)),
			);
		},
	};
}
