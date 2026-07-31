import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_m0gLSUWv7qDlwxDwjj" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "geschriebene",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "geschriebene",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			gender: "Masc",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "geschrieben",
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
	sentenceMarkdown: "Der [geschriebene] Brief lag auf dem Tisch.",
	classifierNotes:
		"Geschriebene is an attributive participial adjective modifying Brief with nominative masculine singular agreement. Under the current German rule, attributive participles classify as ADJ here rather than as VERB.",
	isVerified: true,
} as const satisfies AttestedSelection;
