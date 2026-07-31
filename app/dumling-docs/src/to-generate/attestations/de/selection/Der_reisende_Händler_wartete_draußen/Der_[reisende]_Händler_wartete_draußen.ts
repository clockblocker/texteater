import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_CwUAu8ND1fe14UVqXj" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "reisende",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "reisende",
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
			canonicalForm: "reisend",
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
	sentenceMarkdown: "Der [reisende] Händler wartete draußen.",
	classifierNotes:
		"Reisende is an attributive participial adjective modifying Haendler, with nominative masculine singular agreement. Because the head noun is overt, this is classified as ADJ rather than as the substantivized NOUN analysis used in Der Reisende wartete draussen.",
	isVerified: true,
} as const satisfies AttestedSelection;
