import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const covidXTokenSelection = {
	segmentedSentenceId: "sentence_0GvQ8bmaPyYqWW0x2I" as SegmentedSentenceId,
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [6],
	attestedSurface: "COVID-ish",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "COVID-ish",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "COVID-ish",
			family: "Lexeme",
			kind: "X",
			coreFeatures: {
				foreign: "Yes",
				extPos: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Lexeme", "X">;

export const attestation = {
	selection: covidXTokenSelection,
	sentenceMarkdown: "The report says [COVID-ish] twice.",
	classifierNotes:
		"The hybrid nonce token is X with Foreign=Yes because it resists clean POS assignment in isolation.",
} as const satisfies AttestedSelection;
