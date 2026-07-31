import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection054 = {
	segmentedSentenceId: "sentence_9JHHAEEp3uVEmDfzPF" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "muss",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "muss",
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
			canonicalForm: "müssen",
			family: "Lexeme",
			kind: "AUX",
			coreFeatures: {
				verbType: "Mod",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "AUX">;

export const attestation = {
	selection: deSelection054,
	sentenceMarkdown: "Er [muss] heute arbeiten.",
	classifierNotes:
		"Muss is AUX here because it combines with the overt infinitive arbeiten rather than standing alone as the clause's main predicate.",
	isVerified: true,
} as const satisfies AttestedSelection;
