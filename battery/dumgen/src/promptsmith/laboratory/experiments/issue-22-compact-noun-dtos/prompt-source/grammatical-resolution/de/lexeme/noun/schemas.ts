import {
	compactGrammaticalInputSchema,
	compactGrammaticalOutputSchema,
} from "../../../../../../../../../experiments/issue-22-compact-noun-dtos/compact-codecs";
import type {
	PromptInputSchema,
	PromptOutputSchema,
} from "../../../../../../../../assembly";

export const inputSchema =
	compactGrammaticalInputSchema satisfies PromptInputSchema;
export const outputSchema =
	compactGrammaticalOutputSchema satisfies PromptOutputSchema;
