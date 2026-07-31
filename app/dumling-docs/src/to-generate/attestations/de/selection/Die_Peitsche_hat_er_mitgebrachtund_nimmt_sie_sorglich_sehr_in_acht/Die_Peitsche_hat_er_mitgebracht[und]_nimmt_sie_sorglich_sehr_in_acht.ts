import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_pJroeJAAiSmYPgsKOZ" as SegmentedSentenceId,
	clickedSegmentIndex: 10,
	surfaceSegmentIndices: [10],
	attestedSurface: "und",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "und",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "und",
			family: "Lexeme",
			kind: "CCONJ",
			coreFeatures: {
				conjType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "CCONJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Die Peitsche hat er mitgebracht
[und] nimmt sie sorglich sehr in acht.`,
	classifierNotes: "",
	isVerified: true,
} as const satisfies AttestedSelection;
