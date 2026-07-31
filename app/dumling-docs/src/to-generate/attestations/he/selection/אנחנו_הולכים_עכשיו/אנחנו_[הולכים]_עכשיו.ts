import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const holchimParticipleSelection = {
	segmentedSentenceId: "sentence_GrvdiB3mlfIECds4mg" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "הולכים",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "הולכים",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Masc",
			number: "Plur",
			verbForm: "Part",
			definite: null,
			mood: null,
			person: null,
			polarity: null,
			tense: null,
			voice: null,
		},
		lemma: {
			language: "he",
			canonicalForm: "הלך",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hebBinyan: "PAAL",
				hebExistential: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: holchimParticipleSelection,
	sentenceMarkdown: "אנחנו [הולכים] עכשיו.",
	classifierNotes:
		"Present-like verbal forms are represented as verbForm Part rather than tense Pres.",
} as const satisfies AttestedSelection;
