import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const einChadashTachatSelection = {
	segmentedSentenceId: "sentence_hcaAWFc90sl1C2DMuC" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [0, 2, 4, 6],
	attestedSurface: "אין חדש תחת השמש",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "אין חדש תחת השמש",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "אין חדש תחת השמש",
			family: "Phraseme",
			kind: "Proverb",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Phraseme", "Proverb">;

export const attestation = {
	selection: einChadashTachatSelection,
	sentenceMarkdown: "אין [חדש] תחת השמש.",
	classifierNotes:
		"This is a partial selection against a proverb, not an adjective surface.",
} as const satisfies AttestedSelection;
