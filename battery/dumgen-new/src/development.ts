import { fileURLToPath } from "node:url";
import { defineExperiment, type PromptSource, stableJson } from "promptsmith";
import {
	type EvaluationExecutor,
	type ModelConfiguration,
	runExperiment,
} from "promptsmith/evaluation";
import { saveRun } from "promptsmith/storage";
import { promptRegistrations } from "./concrete-lang/de/experiments.js";
import { relationCorpusAdjudications } from "./concrete-lang/de/knowledge-production/evaluation/adjudications.js";
import { evaluateCombinedGermanKnowledge } from "./concrete-lang/de/knowledge-production/evaluation/evaluator.js";
import phases from "./concrete-lang/de/knowledge-production/evaluation/phases.json";
import {
	evaluateReadingMeaningIsolation,
	meaningIsolationCaseIds,
} from "./concrete-lang/de/reading-emoji-description/evaluator.js";
import { defaultModelConfiguration } from "./universal/model.js";

type Registration = {
	readonly promptSource: PromptSource;
	readonly evaluationCaseIds: readonly string[];
};
const registrations: readonly Registration[] = promptRegistrations;
const phaseEntries = Object.entries(phases).flatMap(([route, selections]) =>
	Object.entries(selections).map(([phase, ids]) => ({
		id: `${route}:${phase}`,
		route,
		ids,
	})),
);
export function listExperiments() {
	return [
		...registrations.map(({ promptSource, evaluationCaseIds }) => ({
			id: promptSource.route,
			demonstrationCount: promptSource.demonstrations?.cases.length ?? 0,
			caseCount: Object.keys(promptSource.goldenCorpus?.cases ?? {})
				.length,
			evaluationCount: evaluationCaseIds.length,
		})),
		...phaseEntries.map((phase) => ({
			id: phase.id,
			demonstrationCount:
				registrations.find(
					(item) => item.promptSource.route === phase.route,
				)?.promptSource.demonstrations?.cases.length ?? 0,
			caseCount: Object.keys(
				registrations.find(
					(item) => item.promptSource.route === phase.route,
				)?.promptSource.goldenCorpus?.cases ?? {},
			).length,
			evaluationCount: phase.ids.length,
		})),
	];
}
export function getExperiment(id: string) {
	const phase = phaseEntries.find((entry) => entry.id === id);
	const route = phase?.route ?? id;
	const registered = registrations.find(
		(item) => item.promptSource.route === route,
	);
	if (!registered) throw Error(`Unknown Dumgen experiment ${id}`);
	const { promptSource, evaluationCaseIds } = registered;
	const corpus = promptSource.goldenCorpus;
	if (!corpus) throw Error(`Experiment ${id} has no canonical corpus`);
	return defineExperiment({
		promptSource,
		evaluation: corpus
			.select(phase?.ids ?? evaluationCaseIds)
			.difference(
				corpus.select(
					promptSource.demonstrations &&
						"ids" in promptSource.demonstrations
						? promptSource.demonstrations.ids
						: [],
				),
			),
		evaluator: (args) => {
			if (
				route.startsWith("knowledge-analysis/de/") &&
				relationCorpusAdjudications.byCaseId[args.caseId]
			)
				return evaluateCombinedGermanKnowledge(
					args as Parameters<
						typeof evaluateCombinedGermanKnowledge
					>[0],
				);
			if (
				route === "reading-resolution/de" &&
				meaningIsolationCaseIds.some((id) => id === args.caseId)
			)
				return evaluateReadingMeaningIsolation(
					args as Parameters<
						typeof evaluateReadingMeaningIsolation
					>[0],
				);
			return {
				contractPass:
					stableJson(args.output) === stableJson(args.idealOutput),
			};
		},
	});
}
export async function evaluateExperiment(args: {
	experimentId: string;
	execute: EvaluationExecutor;
	sourceRevision: string;
	configuration?: ModelConfiguration;
	outputDirectory?: string;
	signal?: AbortSignal;
}) {
	const configuration =
		args.configuration ?? (defaultModelConfiguration as ModelConfiguration);
	const run = await runExperiment({
		experiment: getExperiment(args.experimentId),
		experimentId: args.experimentId,
		evaluatorVersion: "migration-1",
		configuration,
		sourceRevision: args.sourceRevision,
		execute: args.execute,
		signal: args.signal,
	});
	if (args.outputDirectory) await saveRun(args.outputDirectory, run);
	return run;
}

/** Repository default; consumers can always supply a different output directory. */
export const defaultRunOutputDirectory = fileURLToPath(
	new URL("../../.runs/dumgen/", import.meta.resolve("dumgen/package.json")),
);
