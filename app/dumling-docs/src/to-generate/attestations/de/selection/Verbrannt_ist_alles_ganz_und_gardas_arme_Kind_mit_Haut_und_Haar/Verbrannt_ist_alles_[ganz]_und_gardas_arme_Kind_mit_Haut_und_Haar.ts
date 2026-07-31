import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const ganzUndGarIdiomSelection = {
	segmentedSentenceId: "sentence_RQHEa7a4JSv6Tb8uCY" as SegmentedSentenceId,
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [6, 8, 10],
	attestedSurface: "ganz und gar",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "ganz und gar",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "ganz und gar",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	selection: ganzUndGarIdiomSelection,
	sentenceMarkdown: `Verbrannt ist alles [ganz] und gar,
das arme Kind mit Haut und Haar;`,
	classifierNotes:
		"I treated ganz as a partial selection of the fixed intensifying idiom ganz und gar, not as the standalone adjective or adverb lexeme. In this line the learner-relevant meaning-bearing unit is the whole phrase meaning completely.",
	isVerified: true,
} as const satisfies AttestedSelection;
