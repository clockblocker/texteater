import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export const constructions = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"reading-de-construction-fusion-am-temporal": {
			input: {
				markedContext: "Der Kurs beginnt <TARGET>am</TARGET> Montag.",
				lemma: "am",
				existingEmojiDescriptions: ["📍"],
			},
			idealOutput: { decision: "New", emojiDescription: "📅" },
		},
		"reading-de-construction-paired-frame-entweder-oder": {
			input: {
				markedContext:
					"Wir reisen <TARGET>entweder</TARGET> am Freitag <TARGET>oder</TARGET> am Samstag.",
				lemma: "entweder … oder",
				existingEmojiDescriptions: ["🔀"],
			},
			idealOutput: { decision: "Reuse", emojiDescription: "🔀" },
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
