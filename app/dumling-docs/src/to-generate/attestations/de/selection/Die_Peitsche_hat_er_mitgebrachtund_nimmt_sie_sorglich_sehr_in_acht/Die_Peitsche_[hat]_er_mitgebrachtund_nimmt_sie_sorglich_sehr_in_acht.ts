import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_pJroeJAAiSmYPgsKOZ" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "hat",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "hat",
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
			canonicalForm: "haben",
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
	sentenceMarkdown: `Die Peitsche [hat] er mitgebracht
und nimmt sie sorglich sehr in acht.`,
	classifierNotes:
		"Hat is the present finite auxiliary in the perfect construction hat mitgebracht, not a lexical possession verb here.",
	isVerified: true,
} as const satisfies AttestedSelection;
