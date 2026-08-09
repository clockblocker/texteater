import { z } from "zod";

import type { PromptInputSchema, PromptOutputSchema } from "../../../assembly";

export const inputSchema = z.strictObject({
	items: z
		.array(
			z.strictObject({
				id: z.string().min(1),
				sourceText: z.string().min(1),
			}),
		)
		.min(1)
		.max(9),
}) satisfies PromptInputSchema;

// OpenAI Structured Outputs requires an object at the root of every response
// schema. The decision/language correlation is asserted by the catalog entry
// before this private model DTO is projected to IntakeDecision.
export const outputSchema = z.strictObject({
	language: z.enum(["de", "he"]).nullable(),
	items: z.array(
		z.strictObject({
			id: z.string().min(1),
			decision: z.enum([
				"Accepted",
				"UnsupportedLanguage",
				"Unintelligible",
			]),
			language: z.enum(["de", "he"]).nullable(),
			stitchedText: z.string().min(1),
		}),
	),
}) satisfies PromptOutputSchema;
