import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection031 = {
	segmentedSentenceId: "sentence_Uflm0DEwASFt0osVst" as SegmentedSentenceId,
	clickedSegmentIndex: 5,
	surfaceSegmentIndices: [5],
	attestedSurface: "dessen",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "dessen",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Gen",
			gender: "Masc",
			number: "Sing",
			reflex: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "der",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				pronType: "Rel",
				extPos: null,
				foreign: null,
				person: null,
				polite: null,
				poss: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: deSelection031,
	sentenceMarkdown: "Der Autor, [dessen] Buch fehlt, wartet draußen.",
	classifierNotes:
		"Dessen is a genitive relative pronoun with masculine antecedent features from the sentence.",
	isVerified: true,
} as const satisfies AttestedSelection;
