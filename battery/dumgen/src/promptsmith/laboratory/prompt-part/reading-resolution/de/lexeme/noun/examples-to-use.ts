import type { ExampleSet } from "../../../../../../assembly";
import type { inputSchema } from "./input-schema";
import type { outputSchema } from "./output-schema";

export const examplesToUse = [
	{
		id: "reading-noun-use-reuse-tea",
		input: {
			markedContext: "Der <TARGET>Tee</TARGET> duftet.",
			lemma: {
				canonicalForm: "Tee",
				coreFeatures: { gender: "Masc", hyph: null },
			},
			existingEmojiDescriptions: ["☕ Tee"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "☕ Tee",
		},
	},
	{
		id: "reading-noun-use-kitchen-as-room",
		input: {
			markedContext: "Wir trinken Kaffee in der <TARGET>Küche</TARGET>.",
			lemma: {
				canonicalForm: "Küche",
				coreFeatures: { gender: "Fem", hyph: null },
			},
			existingEmojiDescriptions: [],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🍳 Küche",
		},
	},
] as const satisfies ExampleSet<typeof inputSchema, typeof outputSchema>;
