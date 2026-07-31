import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const alHapanimIdiomSelection = {
	segmentedSentenceId: "sentence_Jkb6m19W5MSKboIxxm" as SegmentedSentenceId,
	clickedSegmentIndex: 7,
	surfaceSegmentIndices: [7],
	attestedSurface: "פנים",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "פנים",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "על הפנים",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	selection: alHapanimIdiomSelection,
	sentenceMarkdown: "הראיון היה על ה[פנים].",
	classifierNotes:
		"פנים is a partial selection against the whole idiom על הפנים, not a noun attestation.",
} as const satisfies AttestedSelection;
