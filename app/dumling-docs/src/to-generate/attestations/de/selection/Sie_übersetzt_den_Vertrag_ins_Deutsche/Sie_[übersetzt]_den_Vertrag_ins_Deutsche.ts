import type { AttestedSelection, Selection } from "dumling/types";

const deSelection018 = {
	language: "de",
	spelledSelection: "übersetzt",

	surface: {
		language: "de",
		normalizedFullSurface: "übersetzt",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Pres",
			verbForm: "Fin",
		},
		lemma: {
			language: "de",
			canonicalLemma: "übersetzen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "🌐",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection018,
	sentenceMarkdown: "Sie [übersetzt] den Vertrag ins Deutsche.",
	classifierNotes:
		"The ambiguous surface übersetzt is taken as present finite, not as a participle.",
	isVerified: true,
} as const satisfies AttestedSelection;
