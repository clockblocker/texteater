import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection035 = {
	segmentedSentenceId: "sentence_OCCxXjeD-Gvh_C0fJs" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "keinem",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "keinem",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			gender: "Neut",
			number: "Sing",
			degree: null,
			"gender[psor]": null,
			"number[psor]": null,
		},
		lemma: {
			language: "de",
			canonicalForm: "kein",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
				pronType: "Neg",
				definite: null,
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
	selection: deSelection035,
	sentenceMarkdown: "Mit [keinem] Wort erwähnte sie den Plan.",
	classifierNotes:
		"Keinem is a negative determiner rather than a pronoun because it modifies Wort.",
	isVerified: true,
} as const satisfies AttestedSelection;
