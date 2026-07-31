import { schemasFor } from "dumling/schema";
import type { Lemma } from "dumling/types";
import { z } from "zod";

type GermanNounLemma = Lemma<"de", "Lexeme", "NOUN">;

type ReadingDraft = {
	lemma: GermanNounLemma;
	emojiDescription: string;
};

export type GermanNounReadingPrompt = {
	systemPrompt: string;
	inputSchema: z.ZodType<GermanNounLemma>;
	outputSchema: z.ZodType<ReadingDraft>;
	outputPostcondition: {
		assert(input: GermanNounLemma, generated: ReadingDraft): void;
	};
	generationParams: {
		model: string;
		maxOutputTokens: number;
	};
};

const lemmaSchema =
	schemasFor.de.entity.Lemma.Lexeme.NOUN() as z.ZodType<GermanNounLemma>;

const readingDraftSchema: z.ZodType<ReadingDraft> = z.strictObject({
	lemma: lemmaSchema,
	emojiDescription: z.string().trim().min(1),
});

export const deNounReadingPrompt: GermanNounReadingPrompt = {
	systemPrompt: `You draft one learner-owned Reading for a German noun Lemma.

The input is a validated reusable Lemma. Return a Reading for the contextual use
that motivated this request. Copy the complete structural Lemma into "lemma"
without changing it. Lemma identity consists of language, canonicalForm, family,
kind, and coreFeatures; semantic content must never alter that identity.

"emojiDescription" is a compact, stable emoji label that distinguishes this
Reading from other learner-owned Readings of the same Lemma.`,
	inputSchema: lemmaSchema,
	outputSchema: readingDraftSchema,
	outputPostcondition: {
		assert(input, generated) {
			if (JSON.stringify(generated.lemma) !== JSON.stringify(input)) {
				throw new Error(
					"Generated Reading draft must retain the requested Lemma identity",
				);
			}
		},
	},
	generationParams: {
		model: "gpt-5-nano",
		maxOutputTokens: 256,
	},
};
