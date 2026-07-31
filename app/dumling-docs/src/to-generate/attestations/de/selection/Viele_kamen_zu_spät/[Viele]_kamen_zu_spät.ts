import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_X1zBl1fux0yhlEQTul" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "Viele",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "viele",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			number: "Plur",
			gender: null,
			reflex: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "viel",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				pronType: "Ind",
				extPos: null,
				foreign: null,
				person: null,
				polite: null,
				poss: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "[Viele] kamen zu spät.",
	classifierNotes:
		"Viele is annotated as PRON because it stands substantively for a plural group with no overt noun head. In attributive use, as in viele Leute, the same lexical item would be DET instead.",
	isVerified: true,
} as const satisfies AttestedSelection;
