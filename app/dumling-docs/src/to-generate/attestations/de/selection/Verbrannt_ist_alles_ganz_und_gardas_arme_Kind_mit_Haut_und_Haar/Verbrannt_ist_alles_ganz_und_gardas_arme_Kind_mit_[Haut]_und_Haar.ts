import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_RQHEa7a4JSv6Tb8uCY" as SegmentedSentenceId,
	clickedSegmentIndex: 21,
	surfaceSegmentIndices: [21],
	attestedSurface: "Haut",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Haut",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "Haut",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Fem",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Verbrannt ist alles ganz und gar,
das arme Kind mit [Haut] und Haar;`,
	classifierNotes:
		"Haut is classified word-by-word here because this occurrence is used literally, not idiomatically. The noun is dative singular after mit, even though the attested form is identical to the citation form.",
	classificationMistakes:
		"Do not keep a literally used idiom as a phraseme. The earlier mistake here was classifying Haut as a Partial selection of the idiom mit Haut und Haar instead of as the standalone noun Haut in dative singular.",
	isVerified: true,
} as const satisfies AttestedSelection;
