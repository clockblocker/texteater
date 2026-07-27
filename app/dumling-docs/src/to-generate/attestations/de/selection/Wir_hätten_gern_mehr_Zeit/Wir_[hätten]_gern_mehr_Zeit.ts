import type { AttestedSelection, Selection } from "dumling/types";

const deSelection023 = {
	language: "de",
	spelledSelection: "hätten",

	surface: {
		language: "de",
		normalizedFullSurface: "hätten",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Sub",
			number: "Plur",
			person: "1",
			tense: "Past",
			verbForm: "Fin",
		},
		lemma: {
			language: "de",
			canonicalLemma: "haben",
			lemmaKind: "Lexeme",
			lemmaSubKind: "AUX",
			inherentFeatures: {},
			meaningInEmojis: "🧺",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "AUX">;

export const attestation = {
	selection: deSelection023,
	sentenceMarkdown: "Wir [hätten] gern mehr Zeit.",
	classifierNotes:
		"The Konjunktiv-like form is mapped to supported mood Sub plus past tense.",
	isVerified: true,
} as const satisfies AttestedSelection;
