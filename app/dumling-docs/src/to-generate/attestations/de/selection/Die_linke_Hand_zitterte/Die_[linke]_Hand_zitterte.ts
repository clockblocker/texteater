import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection029 = {
	segmentedSentenceId: "sentence_SKBUWPJfkYOZPjbeJ7" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "linke",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "linke",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			gender: "Fem",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "links",
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
	selection: deSelection029,
	sentenceMarkdown: "Die [linke] Hand zitterte.",
	classifierNotes:
		"This is ordinary adjective agreement, included to contrast the directional adjective with political and proper-noun readings.",
	isVerified: true,
} as const satisfies AttestedSelection;
