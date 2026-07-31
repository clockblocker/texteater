import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection046 = {
	segmentedSentenceId: "sentence_vdNF9z_gAdiB0W6ibh" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0, 2, 4, 6, 8],
	attestedSurface: "Morgenstund hat Gold im Mund",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "morgenstund hat gold im mund",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Morgenstund hat Gold im Mund",
			family: "Phraseme",
			kind: "Proverb",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Phraseme", "Proverb">;

export const attestation = {
	selection: deSelection046,
	sentenceMarkdown: "[Morgenstund] hat Gold im Mund, sagte sie verschlafen.",
	classifierNotes:
		"This is a partial selection inside a proverb, so the surface and lemma are the full proverb.",
	isVerified: true,
} as const satisfies AttestedSelection;
