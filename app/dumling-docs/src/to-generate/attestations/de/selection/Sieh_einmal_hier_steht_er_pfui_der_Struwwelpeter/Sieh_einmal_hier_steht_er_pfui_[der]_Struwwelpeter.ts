import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_MhPGzTBSaMzPHnhyp3" as SegmentedSentenceId,
	clickedSegmentIndex: 15,
	surfaceSegmentIndices: [15],
	attestedSurface: "der",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "der",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			gender: "Masc",
			number: "Sing",
			degree: null,
			"gender[psor]": null,
			"number[psor]": null,
		},
		lemma: {
			language: "de",
			canonicalForm: "der",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
				definite: "Def",
				pronType: "Art",
				extPos: null,
				foreign: null,
				numType: null,
				person: null,
				polite: null,
				poss: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "DET">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Sieh einmal, hier steht er, 
pfui, [der] Struwwelpeter!`,
	classifierNotes:
		"This der is the definite article introducing Struwwelpeter, not a standalone pronoun, so it stays DET even though it precedes a name-like label.",
	isVerified: true,
} as const satisfies AttestedSelection;
