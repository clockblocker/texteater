import type { LinguisticCorpus } from "./concrete-lang/de/authoring.js";
import { knowledgeOperationExperiment } from "./evaluation/knowledge-operation.js";

export { resolveOrGenerateTranslation } from "./concrete-lang/de/knowledge-production/translation/operation.js";

import { fileURLToPath } from "node:url";
import { defineExperiment, type PromptSource, stableJson } from "promptsmith";
import {
	type EvaluationExecutor,
	type ModelConfiguration,
	runExperiment,
	runOperationExperiment,
} from "promptsmith/evaluation";
import { saveRun } from "promptsmith/storage";
import { corpusRegistrations } from "./concrete-lang/de/experiments.js";
import { participleCaseIds } from "./concrete-lang/de/grammatical-resolution/lexeme/adjective/evaluation-ids.js";
import {
	openReferentCaseIds,
	referentContextCaseIds,
} from "./concrete-lang/de/grammatical-resolution/lexeme/pronoun/evaluation-ids.js";
import { evaluateOpenReferent } from "./concrete-lang/de/grammatical-resolution/lexeme/pronoun/evaluator.js";
import { draftTranslationOperationExperiment } from "./concrete-lang/de/knowledge-production/draft-translations/experiment.js";
import { relationCorpusAdjudications } from "./concrete-lang/de/knowledge-production/evaluation/adjudications.js";
import { evaluateCombinedGermanKnowledge } from "./concrete-lang/de/knowledge-production/evaluation/evaluator.js";
import phases from "./concrete-lang/de/knowledge-production/evaluation/phases.json";
import { translationOperationExperiment } from "./concrete-lang/de/knowledge-production/translation/experiment.js";
import {
	evaluateReadingMeaningIsolation,
	meaningIsolationCaseIds,
} from "./concrete-lang/de/reading-emoji-description/evaluator.js";
import { readingOperationExperiment } from "./concrete-lang/de/reading-emoji-description/experiment.js";
import { intakeOperationExperiment } from "./concrete-lang/de/segmentation/experiment.js";
import { sentenceOperationExperiment } from "./concrete-lang/de/sentence-analysis/experiment.js";
import { participleBoundaryCaseIds } from "./concrete-lang/de/target-classification/evaluation-ids.js";
import { targetOperationExperiment } from "./concrete-lang/de/target-classification/experiment.js";
import { grammarOperationExperiment } from "./evaluation/grammar-operation.js";
import type { DumgenOptions } from "./types.js";
import {
	defaultModelConfiguration,
	effectiveConfiguration,
} from "./universal/model-configuration.js";
import { judgmentConfiguration } from "./universal/trace.js";

type Registration = {
	readonly source: LinguisticCorpus | PromptSource;
	readonly evaluationCaseIds: readonly string[];
};
const registrations: readonly Registration[] = corpusRegistrations;
const targetRoute = "target-classification/de/high-level-whole-unit";
/** Named slices of one corpus, run as their own experiments as `route:slice`. */
const slices: Record<string, Record<string, readonly string[]>> = {
	...phases,
	[targetRoute]: { "participle-boundary": participleBoundaryCaseIds },
	"grammatical-resolution/de/lexeme/adjective": {
		participles: participleCaseIds,
	},
	"grammatical-resolution/de/lexeme/pronoun": {
		"referent-context": referentContextCaseIds,
	},
};
const phaseEntries = Object.entries(slices).flatMap(([route, selections]) =>
	Object.entries(selections).map(([phase, ids]) => ({
		id: `${route}:${phase}`,
		route,
		ids,
	})),
);
const routeOf = (id: string) =>
	phaseEntries.find((entry) => entry.id === id)?.route ?? id;
export function listExperiments() {
	const metadataOnly: DumgenOptions = {
		execute: async () => {
			throw Error("Metadata must not execute generation");
		},
		judge: async () => {
			throw Error("Metadata must not execute judgments");
		},
	};
	return [
		...registrations.map(({ source }) => source.route),
		...phaseEntries.map(({ id }) => id),
	].map((id) => {
		const deferred =
			id.includes("lexical-breakdown") ||
			id.includes("morphological-tree");
		const definition = deferred ? getExperiment(id) : null;
		const operation = deferred
			? null
			: operationExperiment(id, metadataOnly);
		const corpus = operation?.corpus ?? definition?.source.goldenCorpus;
		const demonstrations =
			operation?.demonstrations ?? definition?.source.demonstrations;
		return {
			id,
			mode: deferred ? "Deferred" : "Operation",
			demonstrationCount: demonstrations?.cases.length ?? 0,
			caseCount: Object.keys(corpus?.cases ?? {}).length,
			evaluationCount:
				(operation?.evaluation ?? definition?.evaluation)?.cases
					.length ?? 0,
		};
	});
}
export function getExperiment(id: string) {
	const phase = phaseEntries.find((entry) => entry.id === id);
	const route = phase?.route ?? id;
	const registered = registrations.find(
		(item) => item.source.route === route,
	);
	if (!registered) throw Error(`Unknown Dumgen experiment ${id}`);
	const { source, evaluationCaseIds } = registered;
	const corpus = source.goldenCorpus;
	if (!corpus) throw Error(`Experiment ${id} has no canonical corpus`);
	return {
		source,
		evaluation: corpus
			.select(phase?.ids ?? evaluationCaseIds)
			.difference(
				corpus.select(
					source.demonstrations && "ids" in source.demonstrations
						? source.demonstrations.ids
						: [],
				),
			),
		evaluator: (args: {
			caseId: string;
			input: unknown;
			output: unknown;
			idealOutput: unknown;
		}) => {
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
				route === "grammatical-resolution/de/lexeme/pronoun" &&
				openReferentCaseIds.includes(args.caseId)
			)
				return evaluateOpenReferent(args);
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
	};
}
function deferredExperiment(id: string) {
	const definition = getExperiment(id);
	const registered = corpusRegistrations.find(
		({ source }) => source.route === id,
	);
	if (!registered || !("body" in registered.source))
		throw Error(`Not a deferred prompt: ${id}`);
	return defineExperiment({
		promptSource: registered.source,
		evaluation: definition.evaluation,
		evaluator: definition.evaluator,
	});
}

/** Every in-scope evaluation runs the same staged operation as production. */
export function operationExperiment(id: string, options: DumgenOptions) {
	if (id.startsWith("grammatical-resolution/"))
		return grammarOperationExperiment(getExperiment(id), options);
	if (id.startsWith("reading-"))
		return readingOperationExperiment(id, options);
	if (id === "intake") return intakeOperationExperiment(options);
	if (id === "knowledge-analysis/translation")
		return translationOperationExperiment(options);
	if (id === "knowledge-draft/de/translations")
		return draftTranslationOperationExperiment(options);
	if (id.startsWith("knowledge-analysis/de/"))
		return knowledgeOperationExperiment(getExperiment(id), options);
	if (routeOf(id) === targetRoute)
		return targetOperationExperiment(
			options,
			phaseEntries.find((entry) => entry.id === id)?.ids,
		);
	if (id === "sentence-analysis/de")
		return sentenceOperationExperiment(options);
	throw Error(`No production operation for ${id}`);
}

export async function evaluateExperiment(args: {
	experimentId: string;
	execute: EvaluationExecutor;
	judge: DumgenOptions["judge"];
	judgmentConfiguration?: DumgenOptions["judgmentConfiguration"];
	sourceRevision: string;
	configuration?: ModelConfiguration;
	outputDirectory?: string;
	signal?: AbortSignal;
}) {
	if (
		routeOf(args.experimentId) === targetRoute ||
		args.experimentId === "sentence-analysis/de" ||
		args.experimentId.startsWith("grammatical-resolution/") ||
		args.experimentId.startsWith("reading-") ||
		args.experimentId === "intake" ||
		args.experimentId === "knowledge-analysis/translation" ||
		args.experimentId === "knowledge-draft/de/translations" ||
		args.experimentId.startsWith("knowledge-analysis/de/")
	) {
		if (!args.judge)
			throw Error(
				"Operation evaluation requires an explicit judgment executor",
			);
		const options: DumgenOptions = {
			execute: (request) =>
				args.execute({
					...request,
					configuration: request.configuration as ModelConfiguration,
				}),
			judge: args.judge,
			configuration: args.configuration,
			judgmentConfiguration: args.judgmentConfiguration,
		};
		const run = await runOperationExperiment({
			experiment: operationExperiment(args.experimentId, options),
			experimentId: args.experimentId,
			operationVersion:
				args.experimentId === "reading-generation/de"
					? "reading-text-1"
					: "judgments-2",
			evaluatorVersion:
				args.experimentId === "reading-generation/de"
					? "reading-mnemonic-2"
					: "canonical-operation-2",
			sourceRevision: args.sourceRevision,
			configurations: {
				generation: effectiveConfiguration(
					options,
				) as ModelConfiguration,
				judgment: judgmentConfiguration(options),
			},
			signal: args.signal,
		});
		if (args.outputDirectory) await saveRun(args.outputDirectory, run);
		return run;
	}
	const configuration =
		args.configuration ?? (defaultModelConfiguration as ModelConfiguration);
	const run = await runExperiment({
		experiment: deferredExperiment(args.experimentId),
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
