import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection010 = {
	segmentedSentenceId: "sentence_KP17mAzEQ5Ag7t7OYP" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "Mutter",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Mutter",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Mutter",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Fem",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection010,
	sentenceMarkdown: "Die [Mutter] passt nicht auf diese Schraube.",
	classifierNotes:
		"This is the hardware sense Mutter; lexical features match the kinship noun, so the distinction rests on the intended sense.",
	isVerified: true,
} as const satisfies AttestedSelection;
