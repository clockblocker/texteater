import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_lJvgiI_0v_7yv037jc" as SegmentedSentenceId,
	clickedSegmentIndex: 8,
	surfaceSegmentIndices: [8],
	attestedSurface: "Ufers",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Ufers",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Gen",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "Ufer",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Neut",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Einst ging er an [Ufers] Rand
mit der Mappe in der Hand.`,
	classifierNotes:
		"`Ufers` is genitive singular of `Ufer`. In this poetic noun phrase, the genitive depends on `Rand` (`Ufers Rand`), not directly on the preposition `an`.",
	isVerified: true,
} as const satisfies AttestedSelection;
