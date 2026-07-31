import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_jpghSyPUpRZLUZcJk8" as SegmentedSentenceId,
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [0, 6],
	attestedSurface: "Pass auf",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "pass auf",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Imp",
			number: "Sing",
			person: "2",
			verbForm: "Fin",
			tense: null,
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "aufpassen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasGovPrep: "auf",
				hasSepPrefix: "auf",
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Pass auf dich [auf]!",
	classifierNotes:
		'The detached prefix token also points to the verbal surface `pass auf`; the governed preposition is kept separately on the Lemma as `hasGovPrep: "auf"`.',
	isVerified: true,
} as const satisfies AttestedSelection;
