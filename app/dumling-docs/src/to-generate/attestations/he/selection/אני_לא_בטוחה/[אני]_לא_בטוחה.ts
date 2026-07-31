import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const aniPronounSelection = {
	segmentedSentenceId: "sentence_cU6JbsMAvHaK_-EuWk" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "אני",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "אני",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Sing",
			person: "1",
			gender: null,
		},
		lemma: {
			language: "he",
			canonicalForm: "אני",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				pronType: "Prs",
				definite: null,
				reflex: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: aniPronounSelection,
	sentenceMarkdown: "[אני] לא בטוחה.",
	classifierNotes:
		"The first-person pronoun has person and number but no gender feature.",
} as const satisfies AttestedSelection;
