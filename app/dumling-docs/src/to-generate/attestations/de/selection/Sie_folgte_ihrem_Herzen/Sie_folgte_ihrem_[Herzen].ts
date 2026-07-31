import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection014 = {
	segmentedSentenceId: "sentence_6IISz3j3vmH5bnr6qZ" as SegmentedSentenceId,
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [6],
	attestedSurface: "Herzen",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Herzen",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "Herz",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Neut",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection014,
	sentenceMarkdown: "Sie folgte ihrem [Herzen].",
	classifierNotes:
		"Herzen is dative singular here, not plural, despite its weak-looking ending on a neuter noun.",
	isVerified: true,
} as const satisfies AttestedSelection;
