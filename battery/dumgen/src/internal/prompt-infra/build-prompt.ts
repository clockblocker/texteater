import { createPromptExperiment } from "./prompt-experiment";
import type {
	CreatePromptExperimentOptions,
	PromptBuild,
	PromptSource,
} from "./types";

export function buildPrompt(
	source: PromptSource,
	options?: CreatePromptExperimentOptions,
): PromptBuild {
	return createPromptExperiment(source, options).build;
}
