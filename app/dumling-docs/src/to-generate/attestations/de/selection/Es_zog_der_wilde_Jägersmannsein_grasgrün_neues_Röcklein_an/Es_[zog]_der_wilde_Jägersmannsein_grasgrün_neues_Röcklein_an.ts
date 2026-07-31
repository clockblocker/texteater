import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_hrY3GZA_T_nLlgF-kt" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
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
	sentenceMarkdown: `Es [zog] der wilde Jägersmann
	sein grasgrün neues Röcklein an;`,
	classifierNotes:
		"This is the finite part of the separable verb `anziehen`, so the selection is Partial while `normalizedSurface` keeps the full attested verb surface `zog an`.",
	isVerified: true,
} as const satisfies AttestedSelection;
