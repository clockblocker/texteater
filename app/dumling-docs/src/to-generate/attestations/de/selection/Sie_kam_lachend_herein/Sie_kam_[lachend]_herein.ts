import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence__u7qO7Hb-K2ToOjBhX" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "lachend",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "lachend",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			tense: "Pres",
			verbForm: "Part",
			aspect: null,
			gender: null,
			mood: null,
			number: null,
			person: null,
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "lachen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasGovPrep: null,
				hasSepPrefix: null,
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Sie kam [lachend] herein.",
	classifierNotes:
		"Lachend is the present participial form of lachen used non-attributively, so under the repo's German participle rule it stays VERB rather than shifting to ADJ or ADV.",
	isVerified: true,
} as const satisfies AttestedSelection;
