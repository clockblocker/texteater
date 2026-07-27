import type { AttestedSelection, Selection } from "dumling/types";

const twentyFirstAdjectiveOrdinalSelection = {
	language: "en",
	spelledSelection: "twenty-first",

	surface: {
		language: "en",
		normalizedFullSurface: "twenty-first",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "twenty-first",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADJ",
			inherentFeatures: {
				numForm: "Word",
				numType: "Ord",
			},
			meaningInEmojis: "🔢",
		},
	},
} satisfies Selection<"en", "Citation", "Lexeme", "ADJ">;

export const attestation = {
	selection: twentyFirstAdjectiveOrdinalSelection,
	sentenceMarkdown: "The [twenty-first] attempt finally passed.",
	classifierNotes:
		"The hyphenated ordinal modifying a noun is ADJ with ordinal number features.",
} as const satisfies AttestedSelection;
