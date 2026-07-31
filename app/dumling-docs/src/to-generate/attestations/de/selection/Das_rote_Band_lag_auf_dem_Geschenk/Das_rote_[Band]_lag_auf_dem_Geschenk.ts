import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection002 = {
	segmentedSentenceId: "sentence_DlTSMmD1EMt2pojm1D" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "Band",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Band",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Band",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Neut",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection002,
	sentenceMarkdown: "Das rote [Band] lag auf dem Geschenk.",
	classifierNotes:
		"Band is the neuter ribbon or tape sense, kept separate from the music-group and book-volume senses by lexical features and emoji.",
	isVerified: true,
} as const satisfies AttestedSelection;
