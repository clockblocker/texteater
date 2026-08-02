import type { ExampleSet } from "../../../../../../assembly";
import type { inputSchema } from "./input-schema";
import type { outputSchema } from "./output-schema";

export const examplesToUse = [
	{
		id: "reading-noun-use-reuse-tea",
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
		id: "reading-noun-use-kitchen-as-room",
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
] as const satisfies ExampleSet<typeof inputSchema, typeof outputSchema>;
