import type { ExampleSet } from "../../../../assembly";
import type { inputSchema } from "./input-schema";
import type { outputSchema } from "./output-schema";

export const examplesToUse = [
	{
		id: "reading-de-use-reuse-tea",
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
	{
		id: "reading-de-use-kitchen-as-room",
		input: {
			markedContext: "Wir trinken Kaffee in der <TARGET>Küche</TARGET>.",
			lemma: "Küche",
			existingEmojiDescriptions: [],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🍳",
		},
	},
	{
		id: "reading-de-use-aufstehen-uprising-vs-bed",
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
	},
	{
		id: "reading-de-use-zug-select-chess-move",
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
	},
] as const satisfies ExampleSet<typeof inputSchema, typeof outputSchema>;
