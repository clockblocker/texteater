import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const themAccPronounSelection = {
	segmentedSentenceId: "sentence_S3Q0QGiVYsBLGgX7oL" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "them",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "them",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Acc",
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
	selection: themAccPronounSelection,
	sentenceMarkdown: "I emailed [them] yesterday.",
	classifierNotes:
		"Them is an accusative surface of they; singular-they readings are not separately encoded.",
} as const satisfies AttestedSelection;
