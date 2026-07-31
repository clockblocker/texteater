import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const esPronounSelection = {
	segmentedSentenceId: "sentence_sz9vPqpI5wFjuc-oLv" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "Es",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "es",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			gender: "Neut",
			number: "Sing",
			reflex: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "es",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				person: "3",
				pronType: "Prs",
				extPos: null,
				foreign: null,
				polite: null,
				poss: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: esPronounSelection,
	sentenceMarkdown: `[Es] brennt die Hand, es brennt das Haar,
es brennt das ganze Kind sogar.`,
	classifierNotes:
		"Sentence-initial Es is capitalized in clicked Text but normalizedSurface stays lowercase. I treated it as nominative personal-pronoun es in an expletive or presentational use with a postponed nominative subject, rather than as a referential neuter pronoun.",
	isVerified: true,
} as const satisfies AttestedSelection;
