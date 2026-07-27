import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "lief",

	surface: {
		language: "de",
		normalizedFullSurface: "lief",
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
			canonicalLemma: "laufen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "🏃",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `nahm Ranzen, Pulverhorn und Flint
und [lief] hinaus ins Feld geschwind`,
	classificationMistakes:
		"I previously inflated the selected finite verb into the separable verb `hinauslaufen`. With the directional-item rule tightened, the safer analysis here is the ordinary finite verb `laufen`, while `hinaus` is handled separately as an adverb.",
	classifierNotes:
		"The selected token is analyzed as the plain finite verb `lief` from lemma `laufen`. The following `hinaus` is treated separately as a directional adverb rather than being folded into a larger separable-verb payload here.",
	isVerified: true,
} as const satisfies AttestedSelection;
