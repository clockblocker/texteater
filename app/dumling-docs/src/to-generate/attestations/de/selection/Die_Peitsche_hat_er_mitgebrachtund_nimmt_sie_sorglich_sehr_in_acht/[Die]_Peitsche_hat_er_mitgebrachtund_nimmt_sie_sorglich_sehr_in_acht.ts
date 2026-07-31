import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_pJroeJAAiSmYPgsKOZ" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "Die",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "die",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			number: "Sing",
			degree: null,
			gender: null,
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
	sentenceMarkdown: `[Die] Peitsche hat er mitgebracht
und nimmt sie sorglich sehr in acht.`,
	classifierNotes:
		"Sentence-initial Die is the capitalized article form of der, not a pronoun; the determiner surface stays nominative singular here without encoding feminine gender.",
	classificationMistakes:
		"Do not mark ordinary sentence-initial capitalization as a spelling variant. `Die` is a Standard click on a Canonical Surface.",
	isVerified: true,
} as const satisfies AttestedSelection;
