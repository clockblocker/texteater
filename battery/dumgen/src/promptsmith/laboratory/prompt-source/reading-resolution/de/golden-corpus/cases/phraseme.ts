import {
	defineGoldenCases,
	type GoldenCaseRegistry,
} from "../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export const phrasemeCases = defineGoldenCases(import.meta.url, {
	"reading-de-idiom-mit-den-woelfen-heulen": {
		input: {
			markedContext:
				"Obwohl er anderer Meinung war, <TARGET>heulte</TARGET> er <TARGET>mit</TARGET>.",
			lemma: "mit den Wölfen heulen",
			existingEmojiDescriptions: [],
		},
		idealOutput: { decision: "New", emojiDescription: "🐺🗣️🤝" },
	},
	"reading-de-phraseme-discourse-formula-das-tut-mir-leid-sympathy": {
		input: {
			markedContext:
				"Als sie von seiner Krankheit hörte, sagte sie: „<TARGET>Das</TARGET> <TARGET>tut</TARGET> <TARGET>mir</TARGET> <TARGET>leid</TARGET>.“",
			lemma: "Das tut mir leid",
			existingEmojiDescriptions: ["😔", "🙏"],
		},
		idealOutput: { decision: "Reuse", emojiDescription: "😔" },
	},
	"reading-de-phraseme-aphorism-zeit-ist-geld": {
		input: {
			markedContext:
				"Für den knappen Zeitplan gilt: <TARGET>Zeit</TARGET> <TARGET>ist</TARGET> <TARGET>Geld</TARGET>.",
			lemma: "Zeit ist Geld",
			existingEmojiDescriptions: ["⏳💰"],
		},
		idealOutput: { decision: "Reuse", emojiDescription: "⏳💰" },
	},
	"reading-de-phraseme-proverb-viele-koeche": {
		input: {
			markedContext:
				"Im Projekt durfte nun jeder mitentscheiden – <TARGET>viele</TARGET> <TARGET>Köche</TARGET> <TARGET>verderben</TARGET> <TARGET>den</TARGET> <TARGET>Brei</TARGET>.",
			lemma: "Viele Köche verderben den Brei",
			existingEmojiDescriptions: ["👥💥"],
		},
		idealOutput: { decision: "Reuse", emojiDescription: "👥💥" },
	},
	"reading-de-phraseme-idiom-den-faden-verlieren": {
		input: {
			markedContext:
				"Bei der dritten Zwischenfrage <TARGET>verlor</TARGET> die Rednerin <TARGET>den</TARGET> <TARGET>Faden</TARGET>.",
			lemma: "den Faden verlieren",
			existingEmojiDescriptions: ["🧵❌"],
		},
		idealOutput: { decision: "Reuse", emojiDescription: "🧵❌" },
	},
} as const satisfies GoldenCaseRegistry<
	typeof inputSchema,
	typeof outputSchema
>);
