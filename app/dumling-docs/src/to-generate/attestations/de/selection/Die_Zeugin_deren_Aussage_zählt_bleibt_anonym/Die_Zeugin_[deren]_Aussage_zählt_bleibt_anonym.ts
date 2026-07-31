import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection032 = {
	segmentedSentenceId: "sentence_r9MlIZDE97YM_0raNZ" as SegmentedSentenceId,
	clickedSegmentIndex: 5,
	surfaceSegmentIndices: [5],
	attestedSurface: "deren",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "deren",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Gen",
			gender: "Fem",
			number: "Sing",
			reflex: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "der",
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
	selection: deSelection032,
	sentenceMarkdown: "Die Zeugin, [deren] Aussage zählt, bleibt anonym.",
	classifierNotes:
		"Deren is the feminine genitive singular counterpart to dessen in this context.",
	isVerified: true,
} as const satisfies AttestedSelection;
