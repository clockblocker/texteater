import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_AjSWP-CT7Q0tPgaHoz" as SegmentedSentenceId,
	clickedSegmentIndex: 14,
	surfaceSegmentIndices: [14],
	attestedSurface: "hinaus",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "hinaus",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "hinaus",
			family: "Lexeme",
			kind: "ADV",
			coreFeatures: {
				foreign: null,
				numType: null,
				pronType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADV">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Er lief erst nach links und dann [hinaus].",
	classifierNotes:
		"Hinaus is a standalone directional adverb here. The sequence `nach links und dann hinaus` makes the path expression contrastive and compositional rather than forcing a separable-verb reading.",
	isVerified: true,
} as const satisfies AttestedSelection;
