import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const spillTheBeansPartialIdiomSelection = {
	segmentedSentenceId: "sentence_Rz0u0i6SJJdZhE_oqg" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4, 6, 8],
	attestedSurface: "spilled the beans",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "spilled the beans",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "spill the beans",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	selection: spillTheBeansPartialIdiomSelection,
	sentenceMarkdown: "Mira finally [spilled] the beans.",
	classifierNotes:
		"Inflected spilled is selected inside an idiom, but Phraseme currently has citation surfaces only, so this is a partial selection of the citation form.",
} as const satisfies AttestedSelection;
