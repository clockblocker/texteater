import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection050 = {
	segmentedSentenceId: "sentence_VSVnxhUme7foZVnRTL" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "Un",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Un",
		spelling: "Variant",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "un-",
			family: "Morpheme",
			kind: "Prefix",
			coreFeatures: {
				hasSepPrefix: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Morpheme", "Prefix">;

export const attestation = {
	selection: deSelection050,
	sentenceMarkdown: "Das [Un]- in Unkosten wirkt historisch irritierend.",
	classifierNotes:
		"The bound prefix is represented with the canonical hyphenated lemma un-, while the selected spelling excludes the hyphen.",
	isVerified: true,
} as const satisfies AttestedSelection;
