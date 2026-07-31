import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_8dIHSMoDnLP6k1edao" as SegmentedSentenceId,
	clickedSegmentIndex: 16,
	surfaceSegmentIndices: [16],
	attestedSurface: "war",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "war",
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
			canonicalForm: "sein",
			family: "Lexeme",
			kind: "AUX",
			coreFeatures: {
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "AUX">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Er wog vielleicht ein halbes Lot –
und [war] am fünften Tage tot.
`,
	classifierNotes:
		"I kept war under the AUX lemma sein, following the repo's treatment of finite and participial sein forms as auxiliary/copular rather than splitting off a separate lexical verb entry.",
	isVerified: true,
} as const satisfies AttestedSelection;
