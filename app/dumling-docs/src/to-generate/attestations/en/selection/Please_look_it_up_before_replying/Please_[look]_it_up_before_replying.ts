import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const lookUpPartialPhrasalVerbSelection = {
	segmentedSentenceId: "sentence_2LCAEi1T9sTRgWEpBh" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2, 6],
	attestedSurface: "look up",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "look up",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "look up",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				phrasal: "Yes",
				abbr: null,
				extPos: null,
				hasGovPrep: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Lexeme", "VERB">;

export const attestation = {
	selection: lookUpPartialPhrasalVerbSelection,
	sentenceMarkdown: "Please [look] it up before replying.",
	classifierNotes:
		"Discontinuous phrasal verb look ... up is approximated as a partial selection of the citation surface look up.",
} as const satisfies AttestedSelection;
