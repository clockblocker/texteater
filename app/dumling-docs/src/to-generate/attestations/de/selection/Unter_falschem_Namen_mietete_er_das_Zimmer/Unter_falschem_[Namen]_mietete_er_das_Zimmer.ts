import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection015 = {
	segmentedSentenceId: "sentence_JKPshwo02JeovdIW3O" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "Namen",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Namen",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "Name",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection015,
	sentenceMarkdown: "Unter falschem [Namen] mietete er das Zimmer.",
	classifierNotes:
		"Namen is dative singular of the weak masculine noun Name, even though the surface could be plural elsewhere.",
	isVerified: true,
} as const satisfies AttestedSelection;
