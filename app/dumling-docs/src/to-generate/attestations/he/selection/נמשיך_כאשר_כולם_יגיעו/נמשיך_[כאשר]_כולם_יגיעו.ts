import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const kaasherSubordinatorSelection = {
	segmentedSentenceId: "sentence_iHgiJxJU9sYdCZ0QQL" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "כאשר",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "כאשר",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "כאשר",
			family: "Lexeme",
			kind: "SCONJ",
			coreFeatures: {
				case: "Tem",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Lexeme", "SCONJ">;

export const attestation = {
	selection: kaasherSubordinatorSelection,
	sentenceMarkdown: "נמשיך [כאשר] כולם יגיעו.",
	classifierNotes:
		"כאשר is SCONJ with temporal case because the schema exposes that feature for Hebrew subordinators.",
} as const satisfies AttestedSelection;
