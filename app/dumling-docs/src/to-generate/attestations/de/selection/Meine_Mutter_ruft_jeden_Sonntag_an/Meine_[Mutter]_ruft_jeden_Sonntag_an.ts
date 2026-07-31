import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection009 = {
	segmentedSentenceId: "sentence_fdqycltGlJovnXz3xD" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "Mutter",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Mutter",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Mutter",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Fem",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection009,
	sentenceMarkdown: "Meine [Mutter] ruft jeden Sonntag an.",
	classifierNotes: "This is the kinship noun Mutter.",
	isVerified: true,
} as const satisfies AttestedSelection;
