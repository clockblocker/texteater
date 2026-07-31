import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_VIbHKwhDDeC66dyCfn" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "gekochten",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "gekochten",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			number: "Plur",
			gender: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "gekocht",
			family: "Lexeme",
			kind: "ADJ",
			coreFeatures: {
				abbr: null,
				foreign: null,
				numType: null,
				variant: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Die [gekochten] Kartoffeln standen schon bereit.",
	classifierNotes:
		"Gekochten is an attributive participial adjective modifying Kartoffeln. Because it is a noun-modifying agreement form, the current German rule stores it as ADJ rather than as a verbal participle.",
	isVerified: true,
} as const satisfies AttestedSelection;
