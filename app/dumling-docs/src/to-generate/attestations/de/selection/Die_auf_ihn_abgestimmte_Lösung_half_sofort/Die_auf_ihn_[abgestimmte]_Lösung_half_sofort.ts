import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_Z2mNFPOFaC4wxUFSEx" as SegmentedSentenceId,
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [6],
	attestedSurface: "abgestimmte",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "abgestimmte",
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
			canonicalForm: "abgestimmt",
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
	sentenceMarkdown: "Die auf ihn [abgestimmte] Lösung half sofort.",
	classifierNotes:
		"Abgestimmte is an attributive participial adjective modifying Loesung with nominative feminine singular agreement. The dependent phrase auf ihn stays part of the surrounding attestation context, but the highlighted noun-modifying participle still follows the repo's German rule that attributive participles classify as ADJ rather than VERB.",
	isVerified: true,
} as const satisfies AttestedSelection;
