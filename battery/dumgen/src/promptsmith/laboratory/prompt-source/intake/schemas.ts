import { z } from "zod";

import type { PromptInputSchema, PromptOutputSchema } from "../../../assembly";

export const inputSchema = z.strictObject({
	text: z.string().min(1),
}) satisfies PromptInputSchema;

// OpenAI Structured Outputs requires an object at the root of every response
// schema. The decision/language correlation is asserted by the catalog entry
// before this private model DTO is projected to IntakeDecision.
export const outputSchema = z.strictObject({
	decision: z.enum(["Accepted", "UnsupportedLanguage", "Unintelligible"]),
	language: z.string().trim().min(1).nullable(),
}) satisfies PromptOutputSchema;
