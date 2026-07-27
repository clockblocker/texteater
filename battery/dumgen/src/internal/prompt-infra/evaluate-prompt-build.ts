import { createPromptExperiment } from "./prompt-experiment";
import type {
	EvaluatePromptBuildOptions,
	EvaluationRun,
	PromptBuild,
} from "./types";

export async function evaluatePromptBuild(
	options: EvaluatePromptBuildOptions,
): Promise<EvaluationRun> {
	const experiment = createPromptExperiment(options.source, {
		rendererVersion: options.build.rendererVersion,
	});
	validateBuildMatches(options.build, experiment.build);

	return experiment.evaluate({
		executePrompt: options.executePrompt,
		provider: options.provider,
		modelId: options.modelId,
		temperature: options.temperature,
		topP: options.topP,
		seed: options.seed,
		maxOutputTokens: options.maxOutputTokens,
		structuredOutputMode: options.structuredOutputMode,
		retryPolicy: options.retryPolicy,
		executedAt: options.executedAt,
	});
}

function validateBuildMatches(
	build: PromptBuild,
	expectedBuild: PromptBuild,
): void {
	if (build.sourceVersion !== expectedBuild.sourceVersion) {
		throw new Error(
			"PromptBuild sourceVersion does not match PromptSource",
		);
	}

	if (build.buildVersion !== expectedBuild.buildVersion) {
		throw new Error("PromptBuild buildVersion does not match PromptSource");
	}

	if (build.systemPrompt !== expectedBuild.systemPrompt) {
		throw new Error("PromptBuild systemPrompt does not match PromptSource");
	}
}
