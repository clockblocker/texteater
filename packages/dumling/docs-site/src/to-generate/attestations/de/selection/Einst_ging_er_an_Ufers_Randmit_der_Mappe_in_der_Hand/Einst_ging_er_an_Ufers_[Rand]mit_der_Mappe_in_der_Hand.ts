import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "Rand",

	surface: {
		language: "de",
		normalizedFullSurface: "Rand",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "Rand",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Masc",
			},
			meaningInEmojis: "🧭",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Einst ging er an Ufers [Rand]
mit der Mappe in der Hand.`,
	classifierNotes:
		"`Rand` stays citation-shaped here. The attested noun form itself does not overtly distinguish accusative from dative, and this poetic `an Ufers Rand` phrase can be read either as directional movement or as a locative bank-edge setting, so I avoided encoding a guessed case on the surface.",
	classificationMistakes:
		"Do not force a citation-shaped noun into `Surface/Inflection` with guessed case features when the local syntax is genuinely ambiguous. The earlier mistake here was storing `Rand` as accusative singular even though the attested form is syncretic and the phrase also allows a locative reading.",
	isVerified: true,
} as const satisfies AttestedSelection;
