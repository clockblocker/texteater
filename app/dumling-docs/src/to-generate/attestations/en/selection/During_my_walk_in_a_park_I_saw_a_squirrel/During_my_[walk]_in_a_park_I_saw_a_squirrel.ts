import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const walkSelection = {
	segmentedSentenceId: "sentence_30rQNDvo3AIvQR_5LM" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "walk",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "walk",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "walk",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				abbr: null,
				extPos: null,
				foreign: null,
				numForm: null,
				numType: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: walkSelection,
	sentenceMarkdown: "During my [walk] in a park, I saw a squirrel.",
} as const satisfies AttestedSelection;
