import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection053 = {
	segmentedSentenceId: "sentence_SSZXrcxOs6-9KzoSZO" as SegmentedSentenceId,
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [6],
	attestedSurface: "Filosofie",
	selectedOrthography: "Typo",

	surface: {
		language: "de",
		normalizedSurface: "Philosophie",
		spelling: "Variant",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "Philosophie",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Fem",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection053,
	sentenceMarkdown: "Im Heft stand [Filosofie] statt Philosophie.",
	classifierNotes:
		"This is a typo attestation whose noncanonical spelling still points to the canonical lemma Philosophie.",
	isVerified: true,
} as const satisfies AttestedSelection;
