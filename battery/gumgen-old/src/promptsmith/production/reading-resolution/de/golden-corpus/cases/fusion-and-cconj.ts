import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export const fusionAndCconj = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"reading-de-construction-fusion-am-temporal": {
			input: {
				markedContext: "Der Kurs beginnt <TARGET>am</TARGET> Montag.",
				lemma: "am",
				existingEmojiDescriptions: ["📍"],
			},
			idealOutput: { decision: "New", emojiDescription: "📅" },
			explanation:
				"The fused form marks a calendar-time relation, not a place. New.",
		},
		"reading-de-lexeme-cconj-entweder-oder": {
			input: {
				markedContext:
					"Wir reisen <TARGET>entweder</TARGET> am Freitag <TARGET>oder</TARGET> am Samstag.",
				lemma: "entweder … oder",
				existingEmojiDescriptions: ["🔀"],
			},
			idealOutput: { decision: "Reuse", emojiDescription: "🔀" },
			explanation:
				"The multi-member Lexeme/CCONJ presents alternatives. Reuse.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
