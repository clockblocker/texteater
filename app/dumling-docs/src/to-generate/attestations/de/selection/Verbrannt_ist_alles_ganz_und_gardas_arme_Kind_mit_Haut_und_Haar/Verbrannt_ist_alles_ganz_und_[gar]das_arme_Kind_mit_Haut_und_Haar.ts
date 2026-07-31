import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const ganzUndGarIdiomSelection = {
	segmentedSentenceId: "sentence_RQHEa7a4JSv6Tb8uCY" as SegmentedSentenceId,
	clickedSegmentIndex: 10,
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
	sentenceMarkdown: `Verbrannt ist alles ganz und [gar],
das arme Kind mit Haut und Haar;`,
	classifierNotes:
		"Gar can often be a standalone intensifying adverb, and there is another attestation in the repo where that is the best choice. Here I preferred a partial selection of the fixed phrase ganz und gar because the phrase as a whole carries the intended meaning.",
	isVerified: true,
} as const satisfies AttestedSelection;
