import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection033 = {
	segmentedSentenceId: "sentence_uuoN1mFxM85rdzg5rO" as SegmentedSentenceId,
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [6],
	attestedSurface: "Ihrem",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Ihrem",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			gender: "Masc",
			number: "Sing",
			degree: null,
			"gender[psor]": null,
			"number[psor]": null,
		},
		lemma: {
			language: "de",
			canonicalForm: "Ihr",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
				person: "2",
				polite: "Form",
				poss: "Yes",
				pronType: "Prs",
				definite: null,
				extPos: null,
				foreign: null,
				numType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "DET">;

export const attestation = {
	selection: deSelection033,
	sentenceMarkdown: "Bitte folgen Sie [Ihrem] Ansprechpartner.",
	classifierNotes:
		"The capitalized polite possessive is encoded as DET with person 2, polite Form, and poss Yes.",
	classificationMistakes:
		"Do not add gender[psor] or number[psor] unless the attested form or context actually disambiguates them. For polite Ihrem here, the earlier mistake was adding possessor features that are not recoverable from the attestation.",
	isVerified: true,
} as const satisfies AttestedSelection;
