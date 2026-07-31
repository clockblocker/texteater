import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_3rUMwsLOkuX-SI3lqG" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "schlafenden",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "schlafenden",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			number: "Plur",
			gender: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "schlafend",
			family: "Lexeme",
			kind: "ADJ",
			coreFeatures: {
				abbr: null,
				foreign: null,
				numType: null,
				variant: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Die [schlafenden] Kinder wurden nicht geweckt.",
	classifierNotes:
		"Schlafenden is an attributive participial adjective modifying Kinder, so this plural nominative agreement form is stored as ADJ rather than as the verb schlafen.",
	isVerified: true,
} as const satisfies AttestedSelection;
