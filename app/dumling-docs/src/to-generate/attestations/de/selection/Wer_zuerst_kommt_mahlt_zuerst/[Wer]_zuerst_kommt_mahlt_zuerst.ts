import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_46vnAGKM4WrdBbgvFc" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "Wer",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "wer",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			number: "Sing",
			gender: null,
			reflex: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "wer",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				pronType: "Rel",
				extPos: null,
				foreign: null,
				person: null,
				polite: null,
				poss: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "[Wer] zuerst kommt, mahlt zuerst.",
	classifierNotes:
		"Wer heads a free relative clause here, so it is classified as a relative pronoun rather than an interrogative one.",
	isVerified: true,
} as const satisfies AttestedSelection;
