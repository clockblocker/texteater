import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const hashSymbolVariantSelection = {
	segmentedSentenceId: "sentence_DkaQijcDKxy8FR-q4G" as SegmentedSentenceId,
	clickedSegmentIndex: 8,
	surfaceSegmentIndices: [8],
	attestedSurface: "#",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "#",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "number sign",
			family: "Lexeme",
			kind: "SYM",
			coreFeatures: {
				abbr: null,
				extPos: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Lexeme", "SYM">;

export const attestation = {
	selection: hashSymbolVariantSelection,
	sentenceMarkdown: "Tag the issue with [#] before the number.",
	classifierNotes:
		"The symbol surface # points to a worded canonical lemma, number sign.",
} as const satisfies AttestedSelection;
