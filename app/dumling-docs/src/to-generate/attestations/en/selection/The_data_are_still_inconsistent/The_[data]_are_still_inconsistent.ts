import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const dataPluralSelection = {
	segmentedSentenceId: "sentence_2p887y04TSv6S_9LiM" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "data",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "data",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Plur",
		},
		lemma: {
			language: "en",
			canonicalForm: "datum",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				abbr: null,
				extPos: null,
				foreign: null,
				numForm: null,
				numType: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: dataPluralSelection,
	sentenceMarkdown: "The [data] are still inconsistent.",
	classifierNotes:
		"Data is treated as a plural inflection of datum, even though contemporary usage often treats data as mass or singular.",
} as const satisfies AttestedSelection;
