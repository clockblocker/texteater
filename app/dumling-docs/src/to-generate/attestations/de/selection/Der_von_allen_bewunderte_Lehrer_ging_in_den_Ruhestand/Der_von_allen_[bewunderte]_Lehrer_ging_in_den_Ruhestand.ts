import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_Ukem8XyJcoE5BXCYRZ" as SegmentedSentenceId,
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [6],
	attestedSurface: "bewunderte",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "bewunderte",
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
			canonicalForm: "bewundert",
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
	sentenceMarkdown:
		"Der von allen [bewunderte] Lehrer ging in den Ruhestand.",
	classifierNotes:
		"Bewunderte is an attributive participial adjective modifying Lehrer with nominative masculine singular agreement. Despite its verbal origin, this noun-modifying participle follows the repo's German rule that attributive participles classify as ADJ rather than VERB.",
	isVerified: true,
} as const satisfies AttestedSelection;
