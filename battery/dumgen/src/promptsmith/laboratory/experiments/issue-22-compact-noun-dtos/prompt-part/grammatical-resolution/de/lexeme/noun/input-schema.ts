import { compactGrammaticalInputSchema } from "../../../../../../../../../experiments/issue-22-compact-noun-dtos/compact-codecs";
import type { PromptInputSchema } from "../../../../../../../../assembly";

export const inputSchema =
	compactGrammaticalInputSchema satisfies PromptInputSchema;
