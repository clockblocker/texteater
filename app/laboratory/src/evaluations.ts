import {
	defaultRunOutputDirectory,
	evaluateExperiment,
	listExperiments,
} from "dumgen/development";
import type { DumgenOptions } from "dumgen/types";
import type {
	EvaluationExecutor,
	ModelConfiguration,
} from "promptsmith/evaluation";
import { createOpenAIExecutor } from "promptsmith/openai";
import { compareRuns, listRuns, loadRun } from "promptsmith/storage";
import {
	createTypeSafeExecutor,
	type TypeSafeExecutor,
} from "promptsmith/typesafe";
export function createEvaluationService(
	options: {
		outputDirectory?: string;
		judge?: TypeSafeExecutor;
		execute?: EvaluationExecutor;
	} = {},
) {
	const defaultDirectory =
		options.outputDirectory ??
		process.env.DUMGEN_RUN_DIRECTORY ??
		defaultRunOutputDirectory;
	return {
		experiments: listExperiments,
		list: (directory = defaultDirectory) => listRuns(directory),
		open: (runId: string, directory = defaultDirectory) =>
			loadRun(directory, runId),
		compare: async (
			left: string,
			right: string,
			directory = defaultDirectory,
		) =>
			compareRuns(
				await loadRun(directory, left),
				await loadRun(directory, right),
			),
		run: (
			input: {
				experimentId: string;
				sourceRevision: string;
				configuration?: ModelConfiguration;
				judgmentConfiguration?: DumgenOptions["judgmentConfiguration"];
				outputDirectory?: string;
			},
			signal?: AbortSignal,
		) =>
			evaluateExperiment({
				...input,
				outputDirectory: input.outputDirectory ?? defaultDirectory,
				execute: options.execute ?? createOpenAIExecutor(),
				judge:
					options.judge ??
					((request, options) =>
						createTypeSafeExecutor()(request, options)),
				signal,
			}),
	};
}
