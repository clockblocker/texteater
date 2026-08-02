import type { ExampleSet } from "../../../../../../assembly";
import type { inputSchema } from "./input-schema";
import type { outputSchema } from "./output-schema";

export const examplesForTest = [
	{
		id: "reading-noun-test-new-bank",
		input: {
			markedContext: "Die <TARGET>Banken</TARGET>",
			lemma: "Bank",
			existingEmojiDescriptions: [],
		},
		idealOutput: { decision: "New", emojiDescription: "🏦" },
	},
] as const satisfies ExampleSet<typeof inputSchema, typeof outputSchema>;
