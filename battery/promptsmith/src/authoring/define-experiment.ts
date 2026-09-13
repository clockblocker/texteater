import type {
	CaseSelection,
	Experiment,
	ExperimentEvaluation,
	PromptInputSchema,
	PromptOutputSchema,
	PromptSource,
} from "./contracts";
import {
	getGoldenCorpusState,
	getSelectionState,
	tryGetSelectionState,
} from "./golden-corpus";
import { getLocalDemonstrationState } from "./local-demonstrations";
import { assertEntriesUncontaminated } from "./selection-contamination";

/**
 * Binds a Prompt Source to an evaluation from its canonical corpus. Definition
 * fails before a provider call if demonstrations and evaluation contaminate
 * each other by ID, input fingerprint, route fingerprint, or contamination key.
 */
export function defineExperiment<
	InputSchema extends PromptInputSchema,
	OutputSchema extends PromptOutputSchema,
	Result,
>(args: {
	readonly promptSource: PromptSource<InputSchema, OutputSchema>;
	readonly evaluation: CaseSelection<InputSchema, OutputSchema>;
	readonly evaluator: ExperimentEvaluation<InputSchema, OutputSchema, Result>;
}): Experiment<InputSchema, OutputSchema, Result> {
	const demonstrations = args.promptSource.demonstrations;
	const evaluation = getSelectionState(args.evaluation);
	const goldenCorpus = args.promptSource.goldenCorpus;
	if (goldenCorpus === undefined) {
		throw new Error(
			`Experiment for route "${args.promptSource.route}" requires the Prompt Source's canonical Golden Corpus.`,
		);
	}
	const canonical = getGoldenCorpusState(goldenCorpus);
	if (evaluation.corpus.identity !== canonical.identity) {
		throw new Error(
			`Experiment for route "${args.promptSource.route}" must evaluate its canonical Golden Corpus, not a foreign corpus for route "${evaluation.corpus.route}".`,
		);
	}
	if (
		evaluation.corpus.inputSchema !== args.promptSource.inputSchema ||
		evaluation.corpus.outputSchema !== args.promptSource.outputSchema
	) {
		throw new Error(
			`Experiment for route "${args.promptSource.route}" and its evaluation must share the same schema instances.`,
		);
	}
	if (demonstrations !== undefined) {
		const selected = tryGetSelectionState(demonstrations);
		const local =
			selected === undefined
				? getLocalDemonstrationState(demonstrations)
				: undefined;
		if (selected === undefined && local === undefined) {
			throw new Error("Experiment demonstrations were not validated.");
		}
		const demonstrationEntries =
			selected?.entries ??
			local?.entries.map((entry) => ({
				...entry,
				routeFingerprint: evaluation.corpus.fingerprintInput?.(
					entry.value.input,
				),
			})) ??
			[];
		assertEntriesUncontaminated({
			route: args.promptSource.route,
			demonstrations: demonstrationEntries,
			evaluation: evaluation.entries,
		});
	}
	return Object.freeze({ ...args });
}
