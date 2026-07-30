import { schemasFor } from "dumling/schema";
import { z } from "zod";

const grammaticalIdentitySchema = z.strictObject({
	canonicalLemma: z.string().trim().min(1),
	descriptor: schemasFor.de.descriptor.Lemma.Lexeme.NOUN,
});

const semanticIdentitySchema = z.strictObject({
	entity: grammaticalIdentitySchema,
	features: z.strictObject({
		coreDescription: z.string().trim().min(1),
		meaningInEmojis: z.string().trim().min(1),
	}),
	engTranslation: z.string().trim().min(1),
});

export const deNounFeaturesPrompt = {
	systemPrompt: `You identify one lexical sense of a German noun.

The input is a validated grammatical identity. Return a self-contained semantic
identity for that noun. Copy the input into "entity" without changing it.

"features.coreDescription" is a short, concrete description that distinguishes
this sense from the noun's other senses. "features.meaningInEmojis" is a compact
emoji representation of that same sense. "engTranslation" is the shortest
natural English translation for the identified sense.`,
	inputSchema: grammaticalIdentitySchema,
	outputSchema: semanticIdentitySchema,
	generationParams: {
		model: "gpt-5-nano",
		maxOutputTokens: 256,
	},
} as const;
