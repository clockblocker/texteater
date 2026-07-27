import type { AttestedSelection, Selection } from "dumling/types";

const doesAuxSelection = {
	language: "en",
	spelledSelection: "Does",

	surface: {
		language: "en",
		normalizedFullSurface: "does",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Pres",
			verbForm: "Fin",
		},
		lemma: {
			language: "en",
			canonicalLemma: "do",
			lemmaKind: "Lexeme",
			lemmaSubKind: "AUX",
			inherentFeatures: {},
			meaningInEmojis: "❓",
		},
	},
} satisfies Selection<"en", "Inflection", "Lexeme", "AUX">;

export const attestation = {
	selection: doesAuxSelection,
	sentenceMarkdown: "[Does] this key open the archive?",
	classifierNotes:
		"Sentence-initial Does keeps normalizedFullSurface lowercase while spelledSelection preserves casing.",
} as const satisfies AttestedSelection;
