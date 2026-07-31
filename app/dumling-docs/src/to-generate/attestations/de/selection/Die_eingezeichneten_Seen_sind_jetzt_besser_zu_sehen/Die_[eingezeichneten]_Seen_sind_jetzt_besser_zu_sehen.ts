import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_-ZQGt6Ro9bdNkOmtfO" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "eingezeichneten",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "eingezeichneten",
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
			canonicalForm: "eingezeichnet",
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
	sentenceMarkdown: "Die [eingezeichneten] Seen sind jetzt besser zu sehen.",
	classifierNotes:
		"Eingezeichneten is annotated as an attributive adjective inflection here. Unlike bare predicative eingezeichnet, which this repo keeps under the verb einzeichnen, the noun-modifying participial form in die eingezeichneten Seen goes to ADJ.",
	isVerified: true,
} as const satisfies AttestedSelection;
