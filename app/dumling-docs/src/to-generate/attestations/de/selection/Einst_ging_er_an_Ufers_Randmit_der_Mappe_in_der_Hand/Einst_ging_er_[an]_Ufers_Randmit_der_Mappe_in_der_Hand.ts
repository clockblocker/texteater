import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_lJvgiI_0v_7yv037jc" as SegmentedSentenceId,
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [6],
	attestedSurface: "an",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "an",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "an",
			family: "Lexeme",
			kind: "ADP",
			coreFeatures: {
				adpType: "Prep",
				abbr: null,
				extPos: null,
				foreign: null,
				governedCase: null,
				partType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADP">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Einst ging er [an] Ufers Rand
mit der Mappe in der Hand.`,
	classifierNotes:
		"`an` is the ordinary two-way preposition. I left `governedCase` unset because this schema only accepts one value there, while the lexeme alternates between accusative and dative and the local context is not decisive enough to hard-code one on the Lemma itself.",
	isVerified: true,
} as const satisfies AttestedSelection;
