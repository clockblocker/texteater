import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../../schemas";

export const lexemes = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"reading-de-aufstehen-uprising": {
			input: {
				markedContext:
					"Die Bürger <TARGET>stehen</TARGET> gegen die Unterdrückung <TARGET>auf</TARGET>.",
				lemma: "aufstehen",
				existingEmojiDescriptions: ["🛏️⬆️"],
			},
			idealOutput: {
				decision: "New",
				emojiDescription: "✊⬆️",
			},
			explanation: "Revolt, not leave bed. New.",
		},
		"reading-de-aufstehen-morning-six": {
			input: {
				markedContext:
					"Morgen <TARGET>steht</TARGET> sie um sechs Uhr <TARGET>auf</TARGET>.",
				lemma: "aufstehen",
				existingEmojiDescriptions: [],
			},
			idealOutput: { decision: "New", emojiDescription: "🛏️⬆️" },
		},
		"reading-de-lexeme-adv-sonst-usual": {
			input: {
				markedContext:
					"Er arbeitet <TARGET>sonst</TARGET> im Homeoffice, heute aber im Büro.",
				lemma: "sonst",
				existingEmojiDescriptions: ["⚠️"],
			},
			idealOutput: { decision: "New", emojiDescription: "🔁" },
		},
		"reading-de-lexeme-aux-werden-passive": {
			input: {
				markedContext:
					"Der Antrag <TARGET>wird</TARGET> morgen geprüft.",
				lemma: "werden",
				existingEmojiDescriptions: ["🔮"],
			},
			idealOutput: { decision: "New", emojiDescription: "🔄" },
		},
		"reading-de-lexeme-sconj-waehrend-adversative": {
			input: {
				markedContext:
					"<TARGET>Während</TARGET> Lea gern früh beginnt, arbeitet Amir lieber abends.",
				lemma: "während",
				existingEmojiDescriptions: ["⏳"],
			},
			idealOutput: { decision: "New", emojiDescription: "↔️" },
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
