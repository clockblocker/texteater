import type { AttestedSelection, Selection } from "dumling/types";

const sawVerbPastSelection = {
	language: "en",
	spelledSelection: "saw",

	surface: {
		language: "en",
		normalizedFullSurface: "saw",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			tense: "Past",
			verbForm: "Fin",
		},
		lemma: {
			language: "en",
			canonicalLemma: "see",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "👀",
		},
	},
} satisfies Selection<"en", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: sawVerbPastSelection,
	sentenceMarkdown: "I [saw] the comet through binoculars.",
	classifierNotes:
		"Saw is the past finite surface of see, not the citation noun saw.",
} as const satisfies AttestedSelection;
