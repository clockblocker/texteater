import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const likeSubordinatorSelection = {
	segmentedSentenceId: "sentence_gU2tt-YrhhwxU1J3kY" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "like",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "like",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "like",
			family: "Lexeme",
			kind: "SCONJ",
			coreFeatures: {
				style: "Vrnc",
				abbr: null,
				extPos: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Lexeme", "SCONJ">;

export const attestation = {
	selection: likeSubordinatorSelection,
	sentenceMarkdown: "Do it [like] I showed you.",
	classifierNotes:
		"Like as a subordinator is marked SCONJ with vernacular style because many registers prefer as.",
} as const satisfies AttestedSelection;
