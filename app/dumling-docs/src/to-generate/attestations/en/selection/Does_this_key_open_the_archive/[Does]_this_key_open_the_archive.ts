import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const doesAuxSelection = {
	segmentedSentenceId: "sentence_U9DwIGzOa8TSiZ73Jt" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "Does",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "does",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Pres",
			verbForm: "Fin",
		},
		lemma: {
			language: "en",
			canonicalForm: "do",
			family: "Lexeme",
			kind: "AUX",
			coreFeatures: {
				abbr: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Inflection", "Lexeme", "AUX">;

export const attestation = {
	selection: doesAuxSelection,
	sentenceMarkdown: "[Does] this key open the archive?",
	classifierNotes:
		"Sentence-initial Does keeps normalizedSurface lowercase while clicked Text preserves casing.",
} as const satisfies AttestedSelection;
