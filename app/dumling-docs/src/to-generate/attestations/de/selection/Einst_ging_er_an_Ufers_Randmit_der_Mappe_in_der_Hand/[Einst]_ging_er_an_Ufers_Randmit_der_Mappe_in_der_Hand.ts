import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_lJvgiI_0v_7yv037jc" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "Einst",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "einst",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "einst",
			family: "Lexeme",
			kind: "ADV",
			coreFeatures: {
				foreign: null,
				numType: null,
				pronType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADV">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `[Einst] ging er an Ufers Rand
mit der Mappe in der Hand.`,
	classifierNotes: "",
	isVerified: true,
} as const satisfies AttestedSelection;
