import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection013 = {
	segmentedSentenceId: "sentence_RVgogaG469mGy9Gcjn" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "Kindern",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Kindern",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			number: "Plur",
		},
		lemma: {
			language: "de",
			canonicalForm: "Kind",
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
	selection: deSelection013,
	sentenceMarkdown: "Mit den [Kindern] ist es nie langweilig.",
	classifierNotes:
		"Kindern is a dative plural noun with plural -n; the surface features carry both case and number.",
	isVerified: true,
} as const satisfies AttestedSelection;
