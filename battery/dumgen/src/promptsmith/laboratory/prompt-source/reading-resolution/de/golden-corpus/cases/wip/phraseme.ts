import {
	defineGoldenCaseCollection,
	defineGoldenCaseGroup,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../../schemas";

const entscheidungTreffenStorytelling = defineGoldenCaseGroup({
	"reading-de-phraseme-collocation-entscheidung-treffen-new": {
		input: {
			markedContext:
				"Das Team <TARGET>trifft</TARGET> heute <TARGET>eine</TARGET> <TARGET>Entscheidung</TARGET>.",
			lemma: "eine Entscheidung treffen",
			existingEmojiDescriptions: [],
		},
		idealOutput: { decision: "New", emojiDescription: "🤔✅" },
		explanation:
			"The collocation denotes reaching a decision; all three lexical members form one stable concept. New.",
	},
	"reading-de-phraseme-collocation-entscheidung-treffen-reuse": {
		input: {
			markedContext:
				"Wir müssen bald <TARGET>eine</TARGET> <TARGET>Entscheidung</TARGET> <TARGET>treffen</TARGET>.",
			lemma: "eine Entscheidung treffen",
			existingEmojiDescriptions: ["🤔✅"],
		},
		idealOutput: { decision: "Reuse", emojiDescription: "🤔✅" },
		explanation:
			"The same decision-making collocation in another attestation. Reuse.",
	},
} as const satisfies GoldenCaseRegistry<
	typeof inputSchema,
	typeof outputSchema
>);

export const phrasemes = defineGoldenCaseCollection(import.meta.url, {
	groups: { entscheidungTreffenStorytelling },
	cases: {
		"reading-de-idiom-mit-den-woelfen-heulen": {
			input: {
				markedContext:
					"Obwohl er anderer Meinung war, <TARGET>heulte</TARGET> er <TARGET>mit</TARGET> <TARGET>den</TARGET> <TARGET>Wölfen</TARGET>.",
				lemma: "mit den Wölfen heulen",
				existingEmojiDescriptions: [],
			},
			idealOutput: { decision: "New", emojiDescription: "🐺🗣️🤝" },
			explanation:
				"The complete marked idiom means conforming to the group despite disagreement; the compact sequence preserves its stable social structure. New.",
		},
		"reading-de-phraseme-discourse-formula-das-tut-mir-leid-sympathy": {
			input: {
				markedContext:
					"Als sie von seiner Krankheit hörte, sagte sie: „<TARGET>Das</TARGET> <TARGET>tut</TARGET> <TARGET>mir</TARGET> <TARGET>leid</TARGET>.“",
				lemma: "Das tut mir leid",
				existingEmojiDescriptions: ["😔", "🙏"],
			},
			idealOutput: { decision: "Reuse", emojiDescription: "😔" },
			explanation:
				"A conventional expression of sympathy, not literal regret about an action. Reuse.",
		},
		"reading-de-phraseme-aphorism-zeit-ist-geld": {
			input: {
				markedContext:
					"Für den knappen Zeitplan gilt: <TARGET>Zeit</TARGET> <TARGET>ist</TARGET> <TARGET>Geld</TARGET>.",
				lemma: "Zeit ist Geld",
				existingEmojiDescriptions: ["⏳💰"],
			},
			idealOutput: { decision: "Reuse", emojiDescription: "⏳💰" },
			explanation: "The aphorism equates time with money. Reuse.",
		},
		"reading-de-phraseme-proverb-viele-koeche": {
			input: {
				markedContext:
					"Im Projekt durfte nun jeder mitentscheiden – <TARGET>viele</TARGET> <TARGET>Köche</TARGET> <TARGET>verderben</TARGET> <TARGET>den</TARGET> <TARGET>Brei</TARGET>.",
				lemma: "Viele Köche verderben den Brei",
				existingEmojiDescriptions: ["👥💥"],
			},
			idealOutput: { decision: "Reuse", emojiDescription: "👥💥" },
			explanation:
				"The proverb warns that too many participants spoil the result. Reuse.",
		},
		"reading-de-phraseme-idiom-den-faden-verlieren": {
			input: {
				markedContext:
					"Bei der dritten Zwischenfrage <TARGET>verlor</TARGET> die Rednerin <TARGET>den</TARGET> <TARGET>Faden</TARGET>.",
				lemma: "den Faden verlieren",
				existingEmojiDescriptions: ["🧵❌"],
			},
			idealOutput: { decision: "Reuse", emojiDescription: "🧵❌" },
			explanation:
				"Losing one's train of thought, not losing literal thread. Reuse.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
