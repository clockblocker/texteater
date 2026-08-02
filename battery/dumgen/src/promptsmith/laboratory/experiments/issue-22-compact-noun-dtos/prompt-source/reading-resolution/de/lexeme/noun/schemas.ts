import {
	compactReadingInputSchema,
	compactReadingOutputSchema,
} from "../../../../../../../../../experiments/issue-22-compact-noun-dtos/compact-codecs";
import type {
	PromptInputSchema,
	PromptOutputSchema,
} from "../../../../../../../../assembly";

export const inputSchema =
	compactReadingInputSchema satisfies PromptInputSchema;
export const outputSchema =
	compactReadingOutputSchema satisfies PromptOutputSchema;
