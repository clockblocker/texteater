import { z } from "zod";

import type { PromptOutputSchema } from "../../../assembly";

// OpenAI Structured Outputs requires an object at the root of every response
// schema. The decision/language correlation is asserted by the catalog entry
// before this private model DTO is projected to IntakeDecision.
export const outputSchema = z.strictObject({
	decision: z.enum(["Accepted", "UnsupportedLanguage", "Unintelligible"]),
	language: z.string().trim().min(1).nullable(),
}) satisfies PromptOutputSchema;
