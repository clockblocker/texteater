import type { ExampleSet } from "../../../../assembly";
import { adpExamples } from "./examples/adp";
import type { inputSchema } from "./input-schema";
import type { outputSchema } from "./output-schema";

export const examplesForTest = [
	{
		id: "reading-de-bank-financial",
		input: {
			markedContext: "Sie hebt Geld bei der <TARGET>Bank</TARGET> ab.",
			lemma: "Bank",
			existingEmojiDescriptions: ["🪑"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🏦",
		},
	},
	{
		id: "reading-de-key-metaphor",
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
	},
	{
		id: "reading-de-bank-park-bench",
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
	},
	{
		id: "reading-de-aufstehen-morning-six",
		input: {
			markedContext:
				"Morgen <TARGET>steht</TARGET> sie um sechs Uhr <TARGET>auf</TARGET>.",
			lemma: "aufstehen",
			existingEmojiDescriptions: [],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🛏️⬆️",
		},
	},
	{
		id: "reading-de-maus-computer",
		input: {
			markedContext: "Bewege den Zeiger mit der <TARGET>Maus</TARGET>.",
			lemma: "Maus",
			existingEmojiDescriptions: ["🐭"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🖱️",
		},
	},
	{
		id: "reading-de-idiom-mit-den-woelfen-heulen",
		input: {
			markedContext:
				"Obwohl er anderer Meinung war, <TARGET>heulte</TARGET> er <TARGET>mit</TARGET>.",
			lemma: "mit den Wölfen heulen",
			existingEmojiDescriptions: [],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🐺🗣️🤝",
		},
	},
	{
		id: "reading-de-leitung-management",
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
	},
	{
		id: "reading-de-scharf-spicy",
		input: {
			markedContext: "Die Suppe ist sehr <TARGET>scharf</TARGET>.",
			lemma: "scharf",
			existingEmojiDescriptions: ["🔪"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🌶️",
		},
	},
	{
		id: "reading-de-scharf-sharp",
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
	},
	{
		id: "reading-de-absatz-paragraph",
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
	},
	adpExamples.rest[9],
	{
		id: "reading-de-lexeme-adv-sonst-usual",
		input: {
			markedContext:
				"Er arbeitet <TARGET>sonst</TARGET> im Homeoffice, heute aber im Büro.",
			lemma: "sonst",
			existingEmojiDescriptions: ["⚠️"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🔁",
		},
	},
	{
		id: "reading-de-lexeme-aux-werden-passive",
		input: {
			markedContext: "Der Antrag <TARGET>wird</TARGET> morgen geprüft.",
			lemma: "werden",
			existingEmojiDescriptions: ["🔮"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🔄",
		},
	},
	{
		id: "reading-de-lexeme-sconj-waehrend-adversative",
		input: {
			markedContext:
				"<TARGET>Während</TARGET> Lea gern früh beginnt, arbeitet Amir lieber abends.",
			lemma: "während",
			existingEmojiDescriptions: ["⏳"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "↔️",
		},
	},
	{
		id: "reading-de-phraseme-discourse-formula-das-tut-mir-leid-sympathy",
		input: {
			markedContext:
				"Als sie von seiner Krankheit hörte, sagte sie: „<TARGET>Das</TARGET> <TARGET>tut</TARGET> <TARGET>mir</TARGET> <TARGET>leid</TARGET>.“",
			lemma: "Das tut mir leid",
			existingEmojiDescriptions: ["😔", "🙏"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "😔",
		},
	},
	{
		id: "reading-de-phraseme-aphorism-zeit-ist-geld",
		input: {
			markedContext:
				"Für den knappen Zeitplan gilt: <TARGET>Zeit</TARGET> <TARGET>ist</TARGET> <TARGET>Geld</TARGET>.",
			lemma: "Zeit ist Geld",
			existingEmojiDescriptions: ["⏳💰"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "⏳💰",
		},
	},
	{
		id: "reading-de-phraseme-proverb-viele-koeche",
		input: {
			markedContext:
				"Im Projekt durfte nun jeder mitentscheiden – <TARGET>viele</TARGET> <TARGET>Köche</TARGET> <TARGET>verderben</TARGET> <TARGET>den</TARGET> <TARGET>Brei</TARGET>.",
			lemma: "Viele Köche verderben den Brei",
			existingEmojiDescriptions: ["👥💥"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "👥💥",
		},
	},
	{
		id: "reading-de-phraseme-idiom-den-faden-verlieren",
		input: {
			markedContext:
				"Bei der dritten Zwischenfrage <TARGET>verlor</TARGET> die Rednerin <TARGET>den</TARGET> <TARGET>Faden</TARGET>.",
			lemma: "den Faden verlieren",
			existingEmojiDescriptions: ["🧵❌"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "🧵❌",
		},
	},
	{
		id: "reading-de-morpheme-prefix-un-intensifier",
		input: {
			markedContext:
				"Eine <TARGET>Un</TARGET>menge von Anträgen blieb unbearbeitet.",
			lemma: "un-",
			existingEmojiDescriptions: ["🚫", "👎"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "📈",
		},
	},
	{
		id: "reading-de-morpheme-suffix-chen-smallness",
		input: {
			markedContext:
				"Im Karton lag ein winziges Häus<TARGET>chen</TARGET> aus Holz.",
			lemma: "-chen",
			existingEmojiDescriptions: ["🤏", "🥰"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "🤏",
		},
	},
	{
		id: "reading-de-morpheme-suffixoid-frei-absence",
		input: {
			markedContext: "Der Saft ist zucker<TARGET>frei</TARGET>.",
			lemma: "-frei",
			existingEmojiDescriptions: ["🆓"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🚫",
		},
	},
	{
		id: "reading-de-morpheme-circumfix-ge-t-participle",
		input: {
			markedContext:
				"Das Paket wurde sorgfältig <TARGET>ge</TARGET>pack<TARGET>t</TARGET>.",
			lemma: "ge-…-t",
			existingEmojiDescriptions: ["✅"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "✅",
		},
	},
	{
		id: "reading-de-construction-fusion-am-temporal",
		input: {
			markedContext: "Der Kurs beginnt <TARGET>am</TARGET> Montag.",
			lemma: "am",
			existingEmojiDescriptions: ["📍"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "📅",
		},
	},
	{
		id: "reading-de-construction-paired-frame-entweder-oder",
		input: {
			markedContext:
				"Wir reisen <TARGET>entweder</TARGET> am Freitag <TARGET>oder</TARGET> am Samstag.",
			lemma: "entweder … oder",
			existingEmojiDescriptions: ["🔀"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "🔀",
		},
	},
] as const satisfies ExampleSet<typeof inputSchema, typeof outputSchema>;
