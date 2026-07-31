import type { output, ZodType } from "zod";

import {
	deNounReadingPrompt,
	type GermanNounReadingPrompt,
} from "./production/generated-prompts/de-noun-reading";

type PromptGenerationParams = {
	readonly maxOutputTokens: number;
	readonly model: string;
};

type GeneratedOutput<OutputSchema extends ZodType | null> =
	OutputSchema extends ZodType ? output<OutputSchema> : string;

export type Prompt<
	InputSchema extends ZodType = ZodType,
	OutputSchema extends ZodType | null = ZodType | null,
> = {
	readonly systemPrompt: string;
	readonly inputSchema: InputSchema;
	readonly outputSchema: OutputSchema;
	readonly outputPostcondition?: {
		assert(
			input: output<InputSchema>,
			generated: GeneratedOutput<OutputSchema>,
		): void;
	};
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

export type ProductionPromptCatalog = {
	readonly production: {
		readonly classification: Record<never, never>;
		readonly reading: {
			readonly de: {
				readonly noun: {
					readonly draft: PromptCatalogEntry<GermanNounReadingPrompt>;
				};
			};
		};
	};
	readonly laboratory: Record<never, never>;
};

// Generated manifest. Do not edit by hand.
export const PROMPT_CATALOG: ProductionPromptCatalog = {
	production: {
		classification: {},
		reading: {
			de: {
				noun: {
					draft: {
						meta: {
							kind: "prompt",
						},
						prompt: deNounReadingPrompt,
					},
				},
			},
		},
	},
	laboratory: {},
};
