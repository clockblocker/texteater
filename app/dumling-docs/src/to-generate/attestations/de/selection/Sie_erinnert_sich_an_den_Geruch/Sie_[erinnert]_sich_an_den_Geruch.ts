import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection020 = {
	segmentedSentenceId: "sentence_4r2FhGPr0hu8sMg54O" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "erinnert",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "erinnert",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Pres",
			verbForm: "Fin",
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "sich erinnern",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				lexicallyReflexive: "Yes",
				hasGovPrep: "an",
				hasSepPrefix: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection020,
	sentenceMarkdown: "Sie [erinnert] sich an den Geruch.",
	classifierNotes:
		"The lemma is lexically reflexive, but the selected token excludes sich; reflexivity stays inherent on the Lemma.",
	isVerified: true,
} as const satisfies AttestedSelection;
