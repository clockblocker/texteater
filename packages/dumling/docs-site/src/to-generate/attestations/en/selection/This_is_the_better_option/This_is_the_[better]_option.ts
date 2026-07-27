import type { AttestedSelection, Selection } from "dumling/types";

const betterAdjectiveSelection = {
	language: "en",
	spelledSelection: "better",

	surface: {
		language: "en",
		normalizedFullSurface: "better",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			degree: "Cmp",
		},
		lemma: {
			language: "en",
			canonicalLemma: "good",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADJ",
			inherentFeatures: {},
			meaningInEmojis: "👍",
		},
	},
} satisfies Selection<"en", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: betterAdjectiveSelection,
	sentenceMarkdown: "This is the [better] option.",
	classifierNotes:
		"Irregular comparative better is attached to the lemma good with Degree=Cmp.",
} as const satisfies AttestedSelection;
