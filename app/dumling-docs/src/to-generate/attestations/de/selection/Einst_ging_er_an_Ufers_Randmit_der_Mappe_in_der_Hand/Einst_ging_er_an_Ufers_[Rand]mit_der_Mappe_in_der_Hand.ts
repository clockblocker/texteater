import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_lJvgiI_0v_7yv037jc" as SegmentedSentenceId,
	clickedSegmentIndex: 10,
	surfaceSegmentIndices: [10],
	attestedSurface: "Rand",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Rand",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Rand",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				hyph: null,
			},
		},
		surfaceFeatures: null,
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
