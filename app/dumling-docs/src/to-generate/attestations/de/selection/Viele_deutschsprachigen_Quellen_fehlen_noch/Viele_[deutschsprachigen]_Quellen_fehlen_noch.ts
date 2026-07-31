import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection030 = {
	segmentedSentenceId: "sentence_tZzmI439aAuajgu3Rh" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "deutschsprachigen",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "deutschsprachigen",
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
			canonicalForm: "deutschsprachig",
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
	selection: deSelection030,
	sentenceMarkdown: "Viele [deutschsprachigen] Quellen fehlen noch.",
	classifierNotes:
		"Deutschsprachigen looks noun-like in isolation but is annotated as an adjective inflection here.",
	isVerified: true,
} as const satisfies AttestedSelection;
