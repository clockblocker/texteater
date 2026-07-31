import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const readPastHomographSelection = {
	segmentedSentenceId: "sentence_JUl1_FcA5xNeHg-eNn" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "read",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "read",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			tense: "Past",
			verbForm: "Fin",
			mood: null,
			number: null,
			person: null,
			voice: null,
		},
		lemma: {
			language: "en",
			canonicalForm: "read",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				abbr: null,
				extPos: null,
				hasGovPrep: null,
				phrasal: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: readPastHomographSelection,
	sentenceMarkdown: "Yesterday I [read] the warning twice.",
	classifierNotes:
		"Past-tense read is orthographically identical to the citation form; the distinction lives only in surfaceKind and inflectionalFeatures.",
} as const satisfies AttestedSelection;
