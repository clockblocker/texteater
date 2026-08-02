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
		assertNoContamination(
			args.promptSource.route,
			demonstrationEntries,
			evaluation.entries,
		);
	}
	return Object.freeze({ ...args });
}

type Entry = ReturnType<typeof getSelectionState>["entries"][number];

function assertNoContamination(
	route: string,
	demonstrations: readonly Entry[],
	evaluation: readonly Entry[],
): void {
	const checks: readonly {
		readonly name: string;
		readonly conflict: (left: Entry, right: Entry) => boolean;
	}[] = [
		{ name: "case ID", conflict: (left, right) => left.id === right.id },
		{
			name: "exact parsed-input fingerprint",
			conflict: (left, right) =>
				left.exactFingerprint === right.exactFingerprint,
		},
		{
			name: "route-specific fingerprint",
			conflict: (left, right) =>
				left.routeFingerprint !== undefined &&
				right.routeFingerprint !== undefined &&
				left.routeFingerprint === right.routeFingerprint,
		},
		{
			name: "contamination key",
			conflict: (left, right) => {
				const rightKeys = new Set(right.contaminationKeys);
				return left.contaminationKeys.some((key) => rightKeys.has(key));
			},
		},
	];

	for (const check of checks) {
		for (const demonstration of demonstrations) {
			for (const evaluated of evaluation) {
				if (check.conflict(demonstration, evaluated)) {
					throw new Error(
						`Experiment contamination for route "${route}": demonstration case "${demonstration.id}" conflicts with evaluation case "${evaluated.id}" by ${check.name}.`,
					);
				}
			}
		}
	}
}
