import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../../schemas";

export const morphemes = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"reading-de-morpheme-prefix-un-intensifier": {
			input: {
				markedContext:
					"Eine <TARGET>Un</TARGET>menge von Anträgen blieb unbearbeitet.",
				lemma: "un-",
				existingEmojiDescriptions: ["🚫", "👎"],
			},
			idealOutput: { decision: "New", emojiDescription: "📈" },
		},
		"reading-de-morpheme-suffix-chen-smallness": {
			input: {
				markedContext:
					"Im Karton lag ein winziges Häus<TARGET>chen</TARGET> aus Holz.",
				lemma: "-chen",
				existingEmojiDescriptions: ["🤏", "🥰"],
			},
			idealOutput: { decision: "Reuse", emojiDescription: "🤏" },
		},
		"reading-de-morpheme-suffixoid-frei-absence": {
			input: {
				markedContext: "Der Saft ist zucker<TARGET>frei</TARGET>.",
				lemma: "-frei",
				existingEmojiDescriptions: ["🆓"],
			},
			idealOutput: { decision: "New", emojiDescription: "🚫" },
		},
		"reading-de-morpheme-circumfix-ge-t-participle": {
			input: {
				markedContext:
					"Das Paket wurde sorgfältig <TARGET>ge</TARGET>pack<TARGET>t</TARGET>.",
				lemma: "ge-…-t",
				existingEmojiDescriptions: ["✅"],
			},
			idealOutput: { decision: "Reuse", emojiDescription: "✅" },
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
