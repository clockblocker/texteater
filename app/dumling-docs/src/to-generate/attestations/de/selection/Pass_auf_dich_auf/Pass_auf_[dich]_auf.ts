import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const dichReflexivePronounSelection = {
	segmentedSentenceId: "sentence_jpghSyPUpRZLUZcJk8" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "dich",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "dich",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Acc",
			number: "Sing",
			reflex: "Yes",
			gender: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "du",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				person: "2",
				pronType: "Prs",
				extPos: null,
				foreign: null,
				polite: null,
				poss: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: dichReflexivePronounSelection,
	sentenceMarkdown: "Pass auf [dich] auf!",
	classifierNotes:
		"Dich is the accusative second-person pronoun `du`, with reflexive use marked on the inflected surface; it is not part of `normalizedSurface`, which remains the verbal surface `pass auf` for the split verb tokens.",
	isVerified: true,
} as const satisfies AttestedSelection;
