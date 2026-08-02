import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../../schemas";

export const lexemes = defineGoldenCaseCollection(import.meta.url, {
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
		},
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
		"reading-de-bank-financial": {
			input: {
				markedContext:
					"Sie hebt Geld bei der <TARGET>Bank</TARGET> ab.",
				lemma: "Bank",
				existingEmojiDescriptions: ["🪑"],
			},
			idealOutput: { decision: "New", emojiDescription: "🏦" },
		},
		"reading-de-key-metaphor": {
			input: {
				markedContext:
					"Geduld ist der <TARGET>Schlüssel</TARGET> zum Erfolg.",
				lemma: "Schlüssel",
				existingEmojiDescriptions: ["🔑"],
			},
			idealOutput: { decision: "Reuse", emojiDescription: "🔑" },
		},
		"reading-de-bank-park-bench": {
			input: {
				markedContext:
					"Wir sitzen auf einer <TARGET>Bank</TARGET> im Park.",
				lemma: "Bank",
				existingEmojiDescriptions: ["🪑"],
			},
			idealOutput: { decision: "Reuse", emojiDescription: "🪑" },
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
		"reading-de-maus-computer": {
			input: {
				markedContext:
					"Bewege den Zeiger mit der <TARGET>Maus</TARGET>.",
				lemma: "Maus",
				existingEmojiDescriptions: ["🐭"],
			},
			idealOutput: { decision: "New", emojiDescription: "🖱️" },
		},
		"reading-de-leitung-management": {
			input: {
				markedContext:
					"Die <TARGET>Leitung</TARGET> berief eine Sitzung ein.",
				lemma: "Leitung",
				existingEmojiDescriptions: ["🔌"],
			},
			idealOutput: { decision: "New", emojiDescription: "🧑‍💼" },
		},
		"reading-de-scharf-spicy": {
			input: {
				markedContext: "Die Suppe ist sehr <TARGET>scharf</TARGET>.",
				lemma: "scharf",
				existingEmojiDescriptions: ["🔪"],
			},
			idealOutput: { decision: "New", emojiDescription: "🌶️" },
		},
		"reading-de-scharf-sharp": {
			input: {
				markedContext:
					"Das Messer ist <TARGET>scharf</TARGET> genug, um das Brot zu schneiden.",
				lemma: "scharf",
				existingEmojiDescriptions: ["🌶️", "🔪"],
			},
			idealOutput: { decision: "Reuse", emojiDescription: "🔪" },
		},
		"reading-de-absatz-paragraph": {
			input: {
				markedContext:
					"Im zweiten <TARGET>Absatz</TARGET> steht die Begründung.",
				lemma: "Absatz",
				existingEmojiDescriptions: ["👠", "🛒", "📄"],
			},
			idealOutput: { decision: "Reuse", emojiDescription: "📄" },
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
