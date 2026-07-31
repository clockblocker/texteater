import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_pJroeJAAiSmYPgsKOZ" as SegmentedSentenceId,
	clickedSegmentIndex: 14,
	surfaceSegmentIndices: [14],
	attestedSurface: "sie",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "sie",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Acc",
			gender: "Fem",
			number: "Sing",
			reflex: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "sie",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				person: "3",
				pronType: "Prs",
				extPos: null,
				foreign: null,
				polite: null,
				poss: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Die Peitsche hat er mitgebracht
und nimmt [sie] sorglich sehr in acht.`,
	classifierNotes:
		"Sie is the accusative feminine singular object pronoun referring back to Peitsche, not nominative plural or polite Sie.",
	isVerified: true,
} as const satisfies AttestedSelection;
