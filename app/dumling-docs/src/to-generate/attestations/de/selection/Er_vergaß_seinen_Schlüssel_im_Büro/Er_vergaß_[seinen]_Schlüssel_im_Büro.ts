import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection034 = {
	segmentedSentenceId: "sentence_YPAmf4Qg-yEzAlQb6N" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "seinen",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "seinen",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Acc",
			gender: "Masc",
			number: "Sing",
			"gender[psor]": "Masc",
			"number[psor]": "Sing",
			degree: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "sein",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
				person: "3",
				poss: "Yes",
				pronType: "Prs",
				definite: null,
				extPos: null,
				foreign: null,
				numType: null,
				polite: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "DET">;

export const attestation = {
	selection: deSelection034,
	sentenceMarkdown: "Er vergaß [seinen] Schlüssel im Büro.",
	classifierNotes:
		"`Seinen` is the accusative masculine singular possessive determiner agreeing with Schlüssel. Here the subject `Er` makes the possessor reading specifically 3rd-person masculine singular, so the separate possessor features are justified.",
	classificationMistakes:
		"Meaning belongs to a later layer; Dumling records `seinen` as a possessive determiner Surface.",
	isVerified: true,
} as const satisfies AttestedSelection;
