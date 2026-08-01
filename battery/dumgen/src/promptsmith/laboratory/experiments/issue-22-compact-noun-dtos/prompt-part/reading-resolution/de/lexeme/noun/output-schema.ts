import { compactReadingOutputSchema } from "../../../../../../../../../experiments/issue-22-compact-noun-dtos/compact-codecs";
import type { PromptOutputSchema } from "../../../../../../../../assembly";

export const outputSchema =
	compactReadingOutputSchema satisfies PromptOutputSchema;
