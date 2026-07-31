import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_RQHEa7a4JSv6Tb8uCY" as SegmentedSentenceId,
	clickedSegmentIndex: 25,
	surfaceSegmentIndices: [25],
	attestedSurface: "Haar",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Haar",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "Haar",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Neut",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Verbrannt ist alles ganz und gar,
das arme Kind mit Haut und [Haar];`,
	classifierNotes:
		"Haar is classified word-by-word here because the line uses the body-part phrase literally. The noun is dative singular after mit, although the surface form is syncretic with the citation form.",
	classificationMistakes:
		"Do not keep a literally used idiom as a phraseme. The earlier mistake here was classifying Haar as a Partial selection of the idiom mit Haut und Haar instead of as the standalone noun Haar in dative singular.",
	isVerified: true,
} as const satisfies AttestedSelection;
