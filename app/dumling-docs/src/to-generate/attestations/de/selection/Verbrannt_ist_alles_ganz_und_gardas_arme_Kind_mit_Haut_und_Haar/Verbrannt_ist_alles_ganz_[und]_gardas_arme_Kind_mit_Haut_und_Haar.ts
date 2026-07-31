import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const ganzUndGarIdiomSelection = {
	segmentedSentenceId: "sentence_RQHEa7a4JSv6Tb8uCY" as SegmentedSentenceId,
	clickedSegmentIndex: 8,
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
	sentenceMarkdown: `Verbrannt ist alles ganz [und] gar,
das arme Kind mit Haut und Haar;`,
	classifierNotes:
		"The tempting word-level analysis would be CCONJ und, but here und is internal to the frozen intensifier ganz und gar. I therefore kept the learner-facing unit as a partial idiom selection.",
	isVerified: true,
} as const satisfies AttestedSelection;
