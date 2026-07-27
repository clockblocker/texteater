import type { AttestedSelection, Selection } from "dumling/types";

const deSelection016 = {
	language: "de",
	spelledSelection: "umfuhr",

	surface: {
		language: "de",
		normalizedFullSurface: "umfuhr",
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
			canonicalLemma: "umfahren",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "🚗",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection016,
	sentenceMarkdown: "Sie [umfuhr] die Baustelle weiträumig.",
	classifierNotes:
		"This is inseparable umfahren in the past finite form, so there is no separable-prefix feature.",
	isVerified: true,
} as const satisfies AttestedSelection;
