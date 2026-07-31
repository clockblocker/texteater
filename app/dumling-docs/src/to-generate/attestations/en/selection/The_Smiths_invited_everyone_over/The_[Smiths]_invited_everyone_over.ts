import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const smithsPluralProperNounSelection = {
	segmentedSentenceId: "sentence_KPJsMtTPgqleLq4081" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "Smiths",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "Smiths",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Plur",
		},
		lemma: {
			language: "en",
			canonicalForm: "Smith",
			family: "Lexeme",
			kind: "PROPN",
			coreFeatures: {
				abbr: null,
				extPos: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Inflection", "Lexeme", "PROPN">;

export const attestation = {
	selection: smithsPluralProperNounSelection,
	sentenceMarkdown: "The [Smiths] invited everyone over.",
	classifierNotes:
		"Family-name plural is PROPN with inflectional number rather than a common noun.",
} as const satisfies AttestedSelection;
