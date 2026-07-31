import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection006 = {
	segmentedSentenceId: "sentence_LCBDJ_uSWbZRDUkTyj" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "Leiter",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Leiter",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Leiter",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection006,
	sentenceMarkdown: "Der [Leiter] der Werkstatt kam später.",
	classifierNotes:
		"Leiter is the person-role sense here, with masculine gender.",
	isVerified: true,
} as const satisfies AttestedSelection;
