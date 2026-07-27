import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "lag",

	surface: {
		language: "de",
		normalizedFullSurface: "lag",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Past",
			verbForm: "Fin",
		},
		lemma: {
			language: "de",
			canonicalLemma: "liegen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "📍",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Das rote Band [lag] auf dem Geschenk.",
	classifierNotes:
		"Lag is the past finite form of liegen in a stative location reading, not a causative legen form.",
	isVerified: true,
} as const satisfies AttestedSelection;
