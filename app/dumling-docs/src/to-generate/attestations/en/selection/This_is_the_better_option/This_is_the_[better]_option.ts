import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const betterAdjectiveSelection = {
	segmentedSentenceId: "sentence_B_N6eSP96MEiFwYtKT" as SegmentedSentenceId,
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [6],
	attestedSurface: "better",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "better",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			degree: "Cmp",
		},
		lemma: {
			language: "en",
			canonicalForm: "good",
			family: "Lexeme",
			kind: "ADJ",
			coreFeatures: {
				abbr: null,
				extPos: null,
				numForm: null,
				numType: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: betterAdjectiveSelection,
	sentenceMarkdown: "This is the [better] option.",
	classifierNotes:
		"Irregular comparative better is attached to the Lemma good with Degree=Cmp.",
} as const satisfies AttestedSelection;
