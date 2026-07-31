import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const yerushalayimSelection = {
	segmentedSentenceId: "sentence_Is83G4_lpOBFkOza7v" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "ירושלים",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "ירושלים",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Sing",
		},
		lemma: {
			language: "he",
			canonicalForm: "ירושלים",
			family: "Lexeme",
			kind: "PROPN",
			coreFeatures: {
				gender: "Fem",
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "PROPN">;

export const attestation = {
	selection: yerushalayimSelection,
	sentenceMarkdown: "[ירושלים] יפה בלילה.",
	classifierNotes:
		"ירושלים is a proper noun with feminine inherent gender and singular surface number.",
} as const satisfies AttestedSelection;
