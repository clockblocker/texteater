import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_hrY3GZA_T_nLlgF-kt" as SegmentedSentenceId,
	clickedSegmentIndex: 18,
	surfaceSegmentIndices: [2, 18],
	attestedSurface: "zog an",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "zog an",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Past",
			verbForm: "Fin",
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "anziehen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasSepPrefix: "an",
				hasGovPrep: null,
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Es zog der wilde Jägersmann
	sein grasgrün neues Röcklein [an];`,
	classifierNotes:
		"The detached prefix token is still classified against the same separable verbal surface `zog an`, following the existing Dumling pattern for split verbs like `pass auf`.",
	isVerified: true,
} as const satisfies AttestedSelection;
