import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_Oqzo-c6IASFhFyJvP_" as SegmentedSentenceId,
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [6],
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
			gender: "Fem",
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
	sentenceMarkdown:
		"Die mit Bleistift [geschriebene] Notiz lag noch auf dem Tisch.",
	classifierNotes:
		"Geschriebene is an attributive participial adjective modifying Notiz with nominative feminine singular agreement. The surrounding mit Bleistift phrase adds manner/instrument information but does not change the highlight from the adjectival participle classification used here.",
	isVerified: true,
} as const satisfies AttestedSelection;
