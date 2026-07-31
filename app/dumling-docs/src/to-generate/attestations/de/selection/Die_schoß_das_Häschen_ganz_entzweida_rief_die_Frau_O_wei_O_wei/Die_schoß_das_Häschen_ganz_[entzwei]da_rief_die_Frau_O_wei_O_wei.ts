import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_nlIYGNsh2dTsr3Hmki" as SegmentedSentenceId,
	clickedSegmentIndex: 10,
	surfaceSegmentIndices: [10],
	attestedSurface: "entzwei",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "entzwei",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "entzwei",
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
} satisfies Selection<"de", "Citation", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Die schoß das Häschen ganz [entzwei];
da rief die Frau: »O wei! O wei!«`,
	classifierNotes:
		"I treated entzwei as a lexical adjective, following dictionary treatment, even though in this resultative use it feels adverb-like on the surface. Because there is no overt inflection here, the surface is stored as a citation-shaped ADJ rather than as an inflected form.",
	isVerified: true,
} as const satisfies AttestedSelection;
