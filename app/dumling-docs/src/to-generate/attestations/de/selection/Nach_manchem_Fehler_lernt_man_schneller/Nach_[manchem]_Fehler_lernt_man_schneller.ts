import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection036 = {
	segmentedSentenceId: "sentence_9htll0XrQ1XNYuvho8" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "manchem",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "manchem",
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
			canonicalForm: "manch",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
				pronType: "Ind",
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
	selection: deSelection036,
	sentenceMarkdown: "Nach [manchem] Fehler lernt man schneller.",
	classifierNotes:
		"Manchem is annotated as DET because it modifies Fehler; it would be PRON only in substantive use.",
	isVerified: true,
} as const satisfies AttestedSelection;
