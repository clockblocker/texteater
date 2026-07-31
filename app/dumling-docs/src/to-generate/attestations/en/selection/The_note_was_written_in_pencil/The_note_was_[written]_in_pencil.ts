import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const writtenPassiveParticipleSelection = {
	segmentedSentenceId: "sentence_kmPFxSLXVVuhqq7ctq" as SegmentedSentenceId,
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [6],
	attestedSurface: "written",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "written",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			verbForm: "Part",
			voice: "Pass",
			mood: null,
			number: null,
			person: null,
			tense: null,
		},
		lemma: {
			language: "en",
			canonicalForm: "write",
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
	selection: writtenPassiveParticipleSelection,
	sentenceMarkdown: "The note was [written] in pencil.",
	classifierNotes:
		"Voice=Pass is context-sensitive for English participles; it is included to test whether the model accepts contextual morphology.",
} as const satisfies AttestedSelection;
