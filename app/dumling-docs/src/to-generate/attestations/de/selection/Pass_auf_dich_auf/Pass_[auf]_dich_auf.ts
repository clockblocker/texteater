import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_jpghSyPUpRZLUZcJk8" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "auf",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "auf",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "auf",
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
	sentenceMarkdown: "Pass [auf] dich auf!",
	classifierNotes:
		"The governed preposition is a standalone `auf` Surface. It is not a member of the separable verb occurrence `Pass … auf`; future valency may relate it to `aufpassen`.",
	isVerified: true,
} as const satisfies AttestedSelection;
