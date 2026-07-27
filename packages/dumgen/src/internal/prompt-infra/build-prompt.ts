import {
	PROMPT_RENDERER_VERSION,
	SCHEMA_FORMAT_RENDERING_MODE,
} from "./constants";
import { renderSystemPrompt } from "./render/render-system-prompt";
import { serializePromptSource } from "./serialize/serialize-prompt-source";
import { hashString, stableStringify } from "./serialize/stable-stringify";
import type { PromptBuild, PromptSource } from "./types";
import { validatePromptSource } from "./validate-prompt-source";

export function buildPrompt(
	source: PromptSource,
	options?: {
		readonly rendererVersion?: string;
	},
): PromptBuild {
	validatePromptSource(source);

	const rendererVersion = options?.rendererVersion ?? PROMPT_RENDERER_VERSION;
	const sourceVersion = hashString(serializePromptSource(source));
	const buildVersion = hashString(
		stableStringify({
			rendererVersion,
			schemaFormatRenderingMode: SCHEMA_FORMAT_RENDERING_MODE,
			sourceVersion,
		}),
	);
	const usedExamples = source.examples.slice(
		0,
		source.numOfFirstExamplesToUse,
	);
	const evalExamples = source.examples.slice(source.numOfFirstExamplesToUse);

	return {
		systemPrompt: renderSystemPrompt(source, usedExamples),
		sourceVersion,
		buildVersion,
		numOfExamplesUsed: source.numOfFirstExamplesToUse,
		usedExampleIds: usedExamples.map((example) => example.id),
		evalExampleIds: evalExamples.map((example) => example.id),
		rendererVersion,
	};
}
