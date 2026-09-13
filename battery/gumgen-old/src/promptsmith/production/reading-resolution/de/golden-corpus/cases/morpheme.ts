import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export const morphemes = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"reading-de-morpheme-suffix-chen-neighbor-house-isolation": {
			input: {
				markedContext: "Das Häus<TARGET>chen</TARGET> ist alt.",
				lemma: "-chen",
				existingEmojiDescriptions: [],
			},
			idealOutput: { decision: "New", emojiDescription: "🤏" },
			explanation:
				"Diminutive suffix. House belongs to the base; smallness is the suffix's stable contribution.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
