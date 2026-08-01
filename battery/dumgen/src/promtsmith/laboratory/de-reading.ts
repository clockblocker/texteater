import type { Reading } from "dumdict";
import { z } from "zod";

import type { Prompt } from "../prompt-definition";
import { germanLemmaSchema } from "./de-classification-shared";

const readingSchema = z.strictObject({
	lemma: germanLemmaSchema,
	emojiDescription: z.string().trim().min(1),
}) as z.ZodType<Reading<"de">>;

type GermanReadingInput = {
	language: "de";
	context: {
		sentenceText: string;
		attestedSurface: string;
		normalizedSurface: string;
	};
	lemma: Reading<"de">["lemma"];
	existingReadings: Reading<"de">[];
};

const inputSchema: z.ZodType<GermanReadingInput> = z.strictObject({
	language: z.literal("de"),
	context: z.strictObject({
		sentenceText: z.string().min(1),
		attestedSurface: z.string().min(1),
		normalizedSurface: z.string().min(1),
	}),
	lemma: germanLemmaSchema,
	existingReadings: z.array(readingSchema),
});

export const deReadingPrompt: Prompt<typeof inputSchema, typeof readingSchema> =
	{
		systemPrompt: `You resolve one contextual German Lemma use to a learner-owned
Reading in a hands-on linguistic laboratory.

A Reading is exactly the supplied Lemma plus one compact emojiDescription.
Reuse an existing learner Reading when its emojiDescription is close enough to
the contextual concept. Otherwise draft a new compact emoji plus plain-language
gloss. Copy the complete Lemma without changing any grammatical identity field.

Do not invent a Meaning, Sense, confidence, ID, note fields, or prose outside
the schema. This is laboratory classification, not production behavior.`,
		inputSchema,
		outputSchema: readingSchema,
		outputPostcondition: {
			assert(input, generated) {
				if (
					JSON.stringify(generated.lemma) !==
					JSON.stringify(input.lemma)
				) {
					throw new Error(
						"Reading must retain the resolved Lemma identity.",
					);
				}
			},
		},
		generationParams: {
			model: "gpt-5-nano",
			maxOutputTokens: 384,
		},
	};
