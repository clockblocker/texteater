import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_HzEnUe1Lh5PUxfRP0k" as SegmentedSentenceId,
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
	selection: deSelection,
	sentenceMarkdown: `[Es] zog der wilde Jägersmann
		sein grasgrün neues Röcklein an;`,
	classifierNotes:
		"I treated sentence-initial `Es` as the personal pronoun lemma `es` with nominative neuter singular inflection. In this poetic inversion it may function as expletive or presentational `es`, but the current schema has no dedicated expletive feature, so plain PRON is the closest Dumling fit.",
	isVerified: true,
} as const satisfies AttestedSelection;
