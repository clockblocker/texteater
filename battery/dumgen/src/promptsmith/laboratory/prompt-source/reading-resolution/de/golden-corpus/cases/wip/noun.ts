import {
	defineGoldenCaseCollection,
	defineGoldenCaseGroup,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../../schemas";

const bankStorytelling = defineGoldenCaseGroup({
	"reading-de-noun-bank-bench-new": {
		input: {
			markedContext:
				"Die Besucher saßen auf einer langen <TARGET>Bank</TARGET>.",
			lemma: "Bank",
			existingEmojiDescriptions: [],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🪑",
		},
		explanation: "Seating object. New.",
	},
	"reading-de-bank-park-bench": {
		input: {
			markedContext:
				"Wir sitzen auf einer <TARGET>Bank</TARGET> im Park.",
			lemma: "Bank",
			existingEmojiDescriptions: ["🪑"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "🪑",
		},
		explanation: "Same seating object. The park is only scenery. Reuse.",
	},
	"reading-de-bank-financial": {
		input: {
			markedContext: "Sie hebt Geld bei der <TARGET>Bank</TARGET> ab.",
			lemma: "Bank",
			existingEmojiDescriptions: ["🪑"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🏦",
		},
		explanation: "Financial institution, not seating. New.",
	},
	"reading-de-noun-bank-financial-reuse": {
		input: {
			markedContext: "Die <TARGET>Bank</TARGET> genehmigte den Kredit.",
			lemma: "Bank",
			existingEmojiDescriptions: ["🪑", "🏦"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "🏦",
		},
		explanation: "Same financial institution in another context. Reuse.",
	},
} as const satisfies GoldenCaseRegistry<
	typeof inputSchema,
	typeof outputSchema
>);

const schluesselStorytelling = defineGoldenCaseGroup({
	"reading-de-noun-schluessel-literal-new": {
		input: {
			markedContext: "Der <TARGET>Schlüssel</TARGET> steckt im Schloss.",
			lemma: "Schlüssel",
			existingEmojiDescriptions: [],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🔑",
		},
		explanation: "Physical key. New.",
	},
	"reading-de-key-metaphor": {
		input: {
			markedContext:
				"Geduld ist der <TARGET>Schlüssel</TARGET> zum Erfolg.",
			lemma: "Schlüssel",
			existingEmojiDescriptions: ["🔑"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "🔑",
		},
		explanation:
			"Conventional access-to-a-solution metaphor. The key concept still fits. Reuse.",
	},
} as const satisfies GoldenCaseRegistry<
	typeof inputSchema,
	typeof outputSchema
>);

const mausStorytelling = defineGoldenCaseGroup({
	"reading-de-noun-maus-animal-new": {
		input: {
			markedContext: "Die Katze jagt eine <TARGET>Maus</TARGET>.",
			lemma: "Maus",
			existingEmojiDescriptions: [],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🐭",
		},
		explanation: "Animal. New.",
	},
	"reading-de-maus-computer": {
		input: {
			markedContext: "Bewege den Zeiger mit der <TARGET>Maus</TARGET>.",
			lemma: "Maus",
			existingEmojiDescriptions: ["🐭"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🖱️",
		},
		explanation: "Computer device, not the animal. New.",
	},
	"reading-de-noun-maus-computer-reuse": {
		input: {
			markedContext:
				"Die kabellose <TARGET>Maus</TARGET> braucht neue Batterien.",
			lemma: "Maus",
			existingEmojiDescriptions: ["🐭", "🖱️"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "🖱️",
		},
		explanation: "Same computer device with a contextual detail. Reuse.",
	},
} as const satisfies GoldenCaseRegistry<
	typeof inputSchema,
	typeof outputSchema
>);

const absatzStorytelling = defineGoldenCaseGroup({
	"reading-de-noun-absatz-heel-new": {
		input: {
			markedContext:
				"Der <TARGET>Absatz</TARGET> meines Stiefels ist abgebrochen.",
			lemma: "Absatz",
			existingEmojiDescriptions: [],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "👠",
		},
		explanation: "Shoe heel. New.",
	},
	"reading-de-noun-absatz-sales-new": {
		input: {
			markedContext:
				"Der <TARGET>Absatz</TARGET> der neuen Fahrräder steigt.",
			lemma: "Absatz",
			existingEmojiDescriptions: ["👠"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🛒",
		},
		explanation: "Product sales, not a shoe heel. New.",
	},
	"reading-de-noun-absatz-paragraph-new": {
		input: {
			markedContext:
				"Der erste <TARGET>Absatz</TARGET> führt das Thema ein.",
			lemma: "Absatz",
			existingEmojiDescriptions: ["👠", "🛒"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "📄",
		},
		explanation: "Text paragraph, neither a shoe heel nor sales. New.",
	},
	"reading-de-absatz-paragraph": {
		input: {
			markedContext:
				"Im zweiten <TARGET>Absatz</TARGET> steht die Begründung.",
			lemma: "Absatz",
			existingEmojiDescriptions: ["👠", "🛒", "📄"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "📄",
		},
		explanation: "Another text paragraph. Reuse.",
	},
} as const satisfies GoldenCaseRegistry<
	typeof inputSchema,
	typeof outputSchema
>);

/**
 * NOUN emoji-picking rules:
 * - Name the stable noun concept, not its scene, referent, or inflection.
 * - Prefer one conventional emoji for a simple noun Reading.
 * - Split unrelated homonyms and lexicalized uses when reuse would materially
 *   mislead a beginner.
 * - Reuse across contextual variants and transparent conventional metaphor
 *   when the same broad label remains recognizable.
 *
 * Related: `battery/dumgen/docs/persistent/emoji-description-authoring.md`
 */
export const nouns = defineGoldenCaseCollection(import.meta.url, {
	groups: {
		bankStorytelling,
		schluesselStorytelling,
		mausStorytelling,
		absatzStorytelling,
	},
	cases: {
		"reading-de-tea": {
			input: {
				markedContext: "Der <TARGET>Tee</TARGET> duftet.",
				lemma: "Tee",
				existingEmojiDescriptions: ["☕"],
			},
			idealOutput: {
				decision: "Reuse",
				emojiDescription: "☕",
			},
			explanation:
				"The supplied cup already represents the stable tea concept. Reuse.",
		},
		"reading-de-kitchen-room": {
			input: {
				markedContext:
					"Wir trinken Kaffee in der <TARGET>Küche</TARGET>.",
				lemma: "Küche",
				existingEmojiDescriptions: [],
			},
			idealOutput: {
				decision: "New",
				emojiDescription: "🍳",
			},
			explanation:
				"The kitchen room, independent of the coffee-drinking scene. New.",
		},
		"reading-de-zug-chess-move": {
			input: {
				markedContext:
					"Mit diesem <TARGET>Zug</TARGET> setzt sie den König schachmatt.",
				lemma: "Zug",
				existingEmojiDescriptions: ["🚆", "💨", "🧲", "➡️"],
			},
			idealOutput: {
				decision: "Reuse",
				emojiDescription: "➡️",
			},
			explanation: "Chess move. ➡️ already fits.",
		},
		"reading-de-leitung-management": {
			input: {
				markedContext:
					"Die <TARGET>Leitung</TARGET> berief eine Sitzung ein.",
				lemma: "Leitung",
				existingEmojiDescriptions: ["🔌"],
			},
			idealOutput: {
				decision: "New",
				emojiDescription: "🧑‍💼",
			},
			explanation: "Management, not a conducting line. New.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
