import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_MhPGzTBSaMzPHnhyp3" as SegmentedSentenceId,
	clickedSegmentIndex: 12,
	surfaceSegmentIndices: [12],
	attestedSurface: "pfui",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "pfui",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "pfui",
			family: "Lexeme",
			kind: "INTJ",
			coreFeatures: {
				partType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "INTJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Sieh einmal, hier steht er, 
[pfui], der Struwwelpeter!`,
	classifierNotes:
		"Pfui is treated as a plain interjection. I did not force `partType: Res` because this use expresses disgust/exclamation, not the schema's narrower response-particle reading.",
	isVerified: true,
} as const satisfies AttestedSelection;
