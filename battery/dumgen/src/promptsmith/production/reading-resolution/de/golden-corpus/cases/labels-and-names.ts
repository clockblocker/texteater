import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export const labelsAndNames = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"reading-de-lexeme-propn-berlin-city-reuse": {
			input: {
				markedContext:
					"Sie lebt seit Jahren in <TARGET>Berlin</TARGET>.",
				lemma: "Berlin",
				existingEmojiDescriptions: ["🏙️"],
			},
			idealOutput: { decision: "Reuse", emojiDescription: "🏙️" },
			explanation:
				"The city Berlin, independent of this residence scene. Reuse.",
		},
		"reading-de-lexeme-sym-euro-currency-reuse": {
			input: {
				markedContext: "Das kostet zehn <TARGET>€</TARGET>.",
				lemma: "€",
				existingEmojiDescriptions: ["💶"],
			},
			idealOutput: { decision: "Reuse", emojiDescription: "💶" },
			explanation: "The euro currency symbol. Reuse.",
		},
		"reading-de-lexeme-x-lol-laughter-reuse": {
			input: {
				markedContext:
					"Er antwortete im Chat nur mit <TARGET>lol</TARGET>.",
				lemma: "lol",
				existingEmojiDescriptions: ["😂"],
			},
			idealOutput: { decision: "Reuse", emojiDescription: "😂" },
			explanation: "The chat expression marks laughter. Reuse.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
