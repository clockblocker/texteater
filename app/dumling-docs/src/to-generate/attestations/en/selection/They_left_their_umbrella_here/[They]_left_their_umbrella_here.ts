import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const theyPronounPluralSelection = {
	segmentedSentenceId: "sentence_5nxxGUJYrCo8c2MFEo" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "They",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "they",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			number: "Plur",
			gender: null,
			reflex: null,
		},
		lemma: {
			language: "en",
			canonicalForm: "they",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				person: "3",
				pronType: "Prs",
				abbr: null,
				extPos: null,
				poss: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: theyPronounPluralSelection,
	sentenceMarkdown: "[They] left their umbrella here.",
	classifierNotes:
		"They is marked plural because the current English PRON schema has number but no singular-they semantic flag.",
} as const satisfies AttestedSelection;
