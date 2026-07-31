import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const tzahalAbbrevSelection = {
	segmentedSentenceId: "sentence_5IDe6wmVYfPz_Rzb4s" as SegmentedSentenceId,
	clickedSegmentIndex: 5,
	surfaceSegmentIndices: [5],
	attestedSurface: 'צה"ל',
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: 'צה"ל',
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: 'צה"ל',
			family: "Lexeme",
			kind: "PROPN",
			coreFeatures: {
				abbr: "Yes",
				gender: "Masc",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Lexeme", "PROPN">;

export const attestation = {
	selection: tzahalAbbrevSelection,
	sentenceMarkdown: 'הוא שירת ב[צה"ל].',
	classifierNotes:
		'צה"ל is an abbreviated proper noun with the quote mark retained and abbr Yes.',
} as const satisfies AttestedSelection;
