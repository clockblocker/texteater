import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_0rivkOWPmOnponM7nY" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "interessierter",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "interessierter",
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
			canonicalForm: "interessiert",
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
	sentenceMarkdown: "Ein [interessierter] Leser fragte nach.",
	classifierNotes:
		"Interessierter is an attributive adjective inflection modifying Leser, with nominative masculine singular agreement. Because the head noun is overt, this is neither a substantivized noun reading nor a verbal participle entry for classification purposes.",
	isVerified: true,
} as const satisfies AttestedSelection;
