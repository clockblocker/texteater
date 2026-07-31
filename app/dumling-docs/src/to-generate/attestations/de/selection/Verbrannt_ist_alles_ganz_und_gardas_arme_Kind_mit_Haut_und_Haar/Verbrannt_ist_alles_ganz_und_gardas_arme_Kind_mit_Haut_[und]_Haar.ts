import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_RQHEa7a4JSv6Tb8uCY" as SegmentedSentenceId,
	clickedSegmentIndex: 23,
	surfaceSegmentIndices: [23],
	attestedSurface: "und",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "und",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "und",
			family: "Lexeme",
			kind: "CCONJ",
			coreFeatures: {
				conjType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "CCONJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Verbrannt ist alles ganz und gar,
das arme Kind mit Haut [und] Haar;`,
	classifierNotes:
		"Und is classified word-by-word here because the phrase is being used literally, not as an idiom. In this line it is the ordinary coordinating conjunction linking the two literal nouns Haut and Haar.",
	classificationMistakes:
		"Do not keep a literally used idiom as a phraseme. The earlier mistake here was classifying und as a Partial selection of the idiom mit Haut und Haar instead of as the standalone coordinating conjunction und.",
	isVerified: true,
} as const satisfies AttestedSelection;
