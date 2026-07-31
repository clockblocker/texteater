import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const leadNounHomographSelection = {
	segmentedSentenceId: "sentence_TNCTjGC1T2eciPBAqI" as SegmentedSentenceId,
	clickedSegmentIndex: 10,
	surfaceSegmentIndices: [10],
	attestedSurface: "lead",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "lead",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "lead",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				abbr: null,
				extPos: null,
				foreign: null,
				numForm: null,
				numType: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: leadNounHomographSelection,
	sentenceMarkdown: "The pipe contained traces of [lead].",
	classifierNotes:
		"Material lead is a noun lexeme; pronunciation is not represented in the current model.",
} as const satisfies AttestedSelection;
