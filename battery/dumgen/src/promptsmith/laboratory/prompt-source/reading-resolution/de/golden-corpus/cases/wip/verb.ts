import {
	defineGoldenCaseCollection,
	defineGoldenCaseGroup,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../../schemas";

const laufenStorytelling = defineGoldenCaseGroup({
	"reading-de-lexeme-verb-laufen-operate-new": {
		input: {
			markedContext: "Die Maschine <TARGET>läuft</TARGET> wieder.",
			lemma: "laufen",
			existingEmojiDescriptions: ["🏃"],
		},
		idealOutput: { decision: "New", emojiDescription: "⚙️" },
		explanation:
			"A machine operating is not physical running. Create a stable operation reading.",
	},
	"reading-de-lexeme-verb-laufen-operate-reuse": {
		input: {
			markedContext: "Der Motor <TARGET>läuft</TARGET> ruhig.",
			lemma: "laufen",
			existingEmojiDescriptions: ["🏃", "⚙️"],
		},
		idealOutput: { decision: "Reuse", emojiDescription: "⚙️" },
		explanation:
			"A motor operating is the same broad machine-operation reading. Reuse.",
	},
} as const satisfies GoldenCaseRegistry<
	typeof inputSchema,
	typeof outputSchema
>);

export const verbs = defineGoldenCaseCollection(import.meta.url, {
	groups: { laufenStorytelling },
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
			explanation:
				"Ordinary getting out of bed; the two emoji preserve stable lexical structure.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
