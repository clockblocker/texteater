import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const wereSubjunctiveAuxSelection = {
	segmentedSentenceId: "sentence_Fk-lxl-mt6VgwGSVqs" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "were",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "were",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Sub",
			tense: "Past",
			verbForm: "Fin",
			number: null,
			person: null,
		},
		lemma: {
			language: "en",
			canonicalForm: "be",
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
	selection: wereSubjunctiveAuxSelection,
	sentenceMarkdown: "If I [were] you, I would wait.",
	classifierNotes:
		"Were in if I were you is AUX with Mood=Sub; the schema allows mood without forcing person or number.",
} as const satisfies AttestedSelection;
