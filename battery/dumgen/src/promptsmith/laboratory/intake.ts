import { z } from "zod";

import type { Prompt } from "../prompt-definition";

const inputSchema = z.strictObject({ text: z.string().min(1) });
const outputSchema = z.strictObject({
	decision: z.enum(["Accepted", "UnsupportedLanguage", "Unintelligible"]),
});

export const intakePrompt = {
	systemPrompt: `You are the language-agnostic Intake stage for a linguistic laboratory.

Return only one decision. Accepted means the source contains enough useful
German material for German segmentation, even when it also contains local
unknown material, ordinary spelling mistakes, or malformed but intelligible
language. UnsupportedLanguage means valid language outside German.
Unintelligible means gibberish or text too corrupted for a defensible reading.

Do not segment, identify words, correct text, explain, score, or return any
field other than decision.`,
	inputSchema,
	outputSchema,
	generationParams: { model: "gpt-5-nano", maxOutputTokens: 64 },
} satisfies Prompt<typeof inputSchema, typeof outputSchema>;
