import {
	defineGoldenCaseCollection,
	defineGoldenCaseGroup,
	type GoldenCaseRegistry,
} from "../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

const sauerStorytelling = defineGoldenCaseGroup({
	"reading-de-adj-sauer-acidic": {
		input: {
			markedContext:
				"Die Zitronenlimonade schmeckt <TARGET>sauer</TARGET>.",
			lemma: "sauer",
			existingEmojiDescriptions: [],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🍋",
		},
		explanation: "Sour taste. First reading. New.",
	},
	"reading-de-adj-sauer-acidic-reuse": {
		input: {
			markedContext:
				"Wir pflücken die <TARGET>sauren</TARGET> Äpfel später.",
			lemma: "sauer",
			existingEmojiDescriptions: ["🍋"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "🍋",
		},
		explanation: "Same sour taste across bearer and inflection. Reuse.",
	},
	"reading-de-adj-sauer-angry": {
		input: {
			markedContext:
				"Nach der Absage war Lea <TARGET>sauer</TARGET> auf ihren Chef.",
			lemma: "sauer",
			existingEmojiDescriptions: ["🍋"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "😠",
		},
		explanation: "Angry, not sour-tasting. New.",
	},
	"reading-de-adj-sauer-angry-reuse": {
		input: {
			markedContext:
				"Wegen der Verspätung ist er noch immer <TARGET>sauer</TARGET>.",
			lemma: "sauer",
			existingEmojiDescriptions: ["🍋", "😠"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "😠",
		},
		explanation: "Angry again. Reuse.",
	},
} as const satisfies GoldenCaseRegistry<
	typeof inputSchema,
	typeof outputSchema
>);

export const adjectives = defineGoldenCaseCollection(import.meta.url, {
	groups: {
		sauerStorytelling,
	},
	cases: {
		"reading-de-adj-leicht-weight": {
			input: {
				markedContext:
					"Der leere Koffer ist überraschend <TARGET>leicht</TARGET>.",
				lemma: "leicht",
				existingEmojiDescriptions: [],
			},
			idealOutput: {
				decision: "New",
				emojiDescription: "🪶",
			},
			explanation: "Low weight. First reading. New.",
		},
		"reading-de-adj-leicht-easy": {
			input: {
				markedContext: "Die Aufgabe ist <TARGET>leicht</TARGET>.",
				lemma: "leicht",
				existingEmojiDescriptions: ["🪶"],
			},
			idealOutput: {
				decision: "New",
				emojiDescription: "✅",
			},
			explanation: "Easy, not low in weight. New.",
		},
		"reading-de-adj-leicht-easy-reuse": {
			input: {
				markedContext:
					"Diese Anleitung ist <TARGET>leicht</TARGET> zu verstehen.",
				lemma: "leicht",
				existingEmojiDescriptions: ["🪶", "✅"],
			},
			idealOutput: {
				decision: "Reuse",
				emojiDescription: "✅",
			},
			explanation:
				"Easy to understand. Same broad difficulty reading. Reuse.",
		},
		"reading-de-scharf-spicy": {
			input: {
				markedContext: "Die Suppe ist sehr <TARGET>scharf</TARGET>.",
				lemma: "scharf",
				existingEmojiDescriptions: ["🔪"],
			},
			idealOutput: {
				decision: "New",
				emojiDescription: "🌶️",
			},
			explanation: "Spicy, not sharp-edged. New.",
		},
		"reading-de-scharf-sharp": {
			input: {
				markedContext:
					"Das Messer ist <TARGET>scharf</TARGET> genug, um das Brot zu schneiden.",
				lemma: "scharf",
				existingEmojiDescriptions: ["🌶️", "🔪"],
			},
			idealOutput: {
				decision: "Reuse",
				emojiDescription: "🔪",
			},
			explanation: "Sharp-edged. Reuse.",
		},
		"reading-de-adj-blau-colour": {
			input: {
				markedContext:
					"Der Himmel ist heute tief <TARGET>blau</TARGET>.",
				lemma: "blau",
				existingEmojiDescriptions: [],
			},
			idealOutput: {
				decision: "New",
				emojiDescription: "🟦",
			},
			explanation: "Blue colour. First reading. New.",
		},
		"reading-de-adj-blau-drunk": {
			input: {
				markedContext:
					"Nach fünf Bier war er völlig <TARGET>blau</TARGET>.",
				lemma: "blau",
				existingEmojiDescriptions: ["🟦"],
			},
			idealOutput: {
				decision: "New",
				emojiDescription: "🍺",
			},
			explanation: "Drunk, not blue-coloured. New.",
		},
		"reading-de-adj-menschlich-human": {
			input: {
				markedContext:
					"Der <TARGET>menschliche</TARGET> Körper braucht Wasser.",
				lemma: "menschlich",
				existingEmojiDescriptions: [],
			},
			idealOutput: {
				decision: "New",
				emojiDescription: "🧑",
			},
			explanation: "Relating to humans. First reading. New.",
		},
		"reading-de-adj-menschlich-humane": {
			input: {
				markedContext:
					"Ihr Umgang mit den Patienten war stets <TARGET>menschlich</TARGET>.",
				lemma: "menschlich",
				existingEmojiDescriptions: ["🧑"],
			},
			idealOutput: {
				decision: "New",
				emojiDescription: "❤️",
			},
			explanation: "Humane and compassionate, not merely human. New.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
