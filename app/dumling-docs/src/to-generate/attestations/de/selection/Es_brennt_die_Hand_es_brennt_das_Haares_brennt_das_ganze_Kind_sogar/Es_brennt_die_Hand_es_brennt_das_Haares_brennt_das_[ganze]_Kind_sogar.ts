import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const ganzeAdjectiveSelection = {
	segmentedSentenceId: "sentence_sz9vPqpI5wFjuc-oLv" as SegmentedSentenceId,
	clickedSegmentIndex: 24,
	surfaceSegmentIndices: [24],
	attestedSurface: "ganze",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "ganze",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			gender: "Neut",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "ganz",
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
	selection: ganzeAdjectiveSelection,
	sentenceMarkdown: `Es brennt die Hand, es brennt das Haar,
es brennt das [ganze] Kind sogar.`,
	classifierNotes:
		"Ganze is an attributive adjective modifying Kind. The surface form is syncretic between neuter nominative and accusative singular after das; I chose nominative because in this rhyme das ganze Kind reads as the postposed subject of brennt.",
	isVerified: true,
} as const satisfies AttestedSelection;
