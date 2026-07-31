import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_VWX7Q8sPV5qaSg76hi" as SegmentedSentenceId,
	clickedSegmentIndex: 17,
	surfaceSegmentIndices: [17],
	attestedSurface: "zu",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "zu",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "zu",
			family: "Lexeme",
			kind: "ADP",
			coreFeatures: {
				adpType: "Prep",
				governedCase: "Dat",
				abbr: null,
				extPos: null,
				foreign: null,
				partType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADP">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Und Minz und Maunz, die schreien
gar jämmerlich [zu] zweien`,
	classifierNotes:
		"Here zu is the preposition heading the fixed adverbial phrase zu zweien, so I kept it as ADP rather than reading it as infinitival or separable-particle zu.",
	isVerified: true,
} as const satisfies AttestedSelection;
