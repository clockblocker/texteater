import { z } from "zod";

import type { PromptOutputSchema } from "../../../assembly";

export const outputSchema = z.discriminatedUnion("decision", [
	z.strictObject({
		decision: z.literal("Accepted"),
		language: z.literal("de"),
	}),
	z.strictObject({
		decision: z.literal("UnsupportedLanguage"),
		language: z.string().trim().min(1),
	}),
	z.strictObject({
		decision: z.literal("Unintelligible"),
		language: z.null(),
	}),
]) satisfies PromptOutputSchema;
