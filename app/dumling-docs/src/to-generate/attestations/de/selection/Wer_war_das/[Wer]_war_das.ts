import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_3QjHOr7RpvmmpWO__7" as SegmentedSentenceId,
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
				pronType: "Int",
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
	sentenceMarkdown: "[Wer] war das?",
	classifierNotes:
		"Wer is an interrogative pronoun here because it asks for the identity of the referent rather than linking a clause back to an antecedent.",
	isVerified: true,
} as const satisfies AttestedSelection;
