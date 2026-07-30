import type { ZodType } from "zod";

import { deNounFeaturesPrompt } from "./production/generated-prompts/de-noun-features";

type PromptGenerationParams = {
	readonly maxOutputTokens: number;
	readonly model: string;
};

export type Prompt<
	InputSchema extends ZodType = ZodType,
	OutputSchema extends ZodType | null = ZodType | null,
> = {
	readonly systemPrompt: string;
	readonly inputSchema: InputSchema;
	readonly outputSchema: OutputSchema;
	readonly generationParams: PromptGenerationParams;
};

export type PromptCatalogEntry<Definition extends Prompt = Prompt> = {
	readonly meta: {
		readonly kind: "prompt";
	};
	readonly prompt: Definition;
};

export type PromptTree = {
	readonly [key: string]: PromptTree | PromptCatalogEntry;
};

// Generated manifest. Do not edit by hand.
export const PROMPT_CATALOG = {
	production: {
		classification: {},
		noteBlock: {
			de: {
				noun: {
					features: {
						meta: {
							kind: "prompt",
						},
						prompt: deNounFeaturesPrompt,
					},
				},
			},
		},
	},
	laboratory: {},
} as const satisfies PromptTree;
