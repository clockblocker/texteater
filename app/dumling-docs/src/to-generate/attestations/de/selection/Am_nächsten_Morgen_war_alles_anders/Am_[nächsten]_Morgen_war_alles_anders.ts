import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection028 = {
	segmentedSentenceId: "sentence_xqLp_lkYYRnJqE3nOg" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "nächsten",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "nächsten",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			degree: "Pos",
			gender: "Masc",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "nächst",
			family: "Lexeme",
			kind: "ADJ",
			coreFeatures: {
				abbr: null,
				foreign: null,
				numType: null,
				variant: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection028,
	sentenceMarkdown: "Am [nächsten] Morgen war alles anders.",
	classifierNotes:
		"Nächsten is treated here as an inflected form of the lexical adjective nächst in its temporal 'next/upcoming' sense, not as the superlative of nah.",
	classificationMistakes:
		"Do not force this row under lemma nah with degree Sup just because nächsten is historically related to nah. In this attestation the learner-facing meaning is temporal 'next', so the earlier mistakes were using canonicalLemma nah, degree Sup, and a proximity-style emoji instead of modeling lexical nächst directly.",
	isVerified: true,
} as const satisfies AttestedSelection;
