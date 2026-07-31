import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection001 = {
	segmentedSentenceId: "sentence_ajIP5KV5kzJAhXtQGg" as SegmentedSentenceId,
	clickedSegmentIndex: 10,
	surfaceSegmentIndices: [10],
	attestedSurface: "Seen",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Seen",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			number: "Plur",
		},
		lemma: {
			language: "de",
			canonicalForm: "See",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection001,
	sentenceMarkdown: "Auf der Karte sind drei [Seen] eingezeichnet.",
	classifierNotes:
		"Plural noun with masculine lemma See; the capitalized surface is normalized by the encoder.",
	isVerified: true,
} as const satisfies AttestedSelection;
