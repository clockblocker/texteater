import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const whosePronounPossessiveSelection = {
	segmentedSentenceId: "sentence_10r0wzYy5dykiepx3j" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "Whose",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "whose",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Gen",
			gender: null,
			number: null,
			reflex: null,
		},
		lemma: {
			language: "en",
			canonicalForm: "who",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				poss: "Yes",
				pronType: "Int",
				abbr: null,
				extPos: null,
				person: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: whosePronounPossessiveSelection,
	sentenceMarkdown: "[Whose] keys are these?",
	classifierNotes:
		"Whose is attached to who with possessive and interrogative inherent features plus genitive surface case.",
} as const satisfies AttestedSelection;
