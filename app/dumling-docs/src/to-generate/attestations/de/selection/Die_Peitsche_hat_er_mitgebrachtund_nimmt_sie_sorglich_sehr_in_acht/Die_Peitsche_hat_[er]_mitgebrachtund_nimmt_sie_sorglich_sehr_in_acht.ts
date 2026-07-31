import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_pJroeJAAiSmYPgsKOZ" as SegmentedSentenceId,
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [6],
	attestedSurface: "er",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "er",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			gender: "Masc",
			number: "Sing",
			reflex: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "er",
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
	sentenceMarkdown: `Die Peitsche hat [er] mitgebracht
und nimmt sie sorglich sehr in acht.`,
	classifierNotes: "",
	isVerified: true,
} as const satisfies AttestedSelection;
