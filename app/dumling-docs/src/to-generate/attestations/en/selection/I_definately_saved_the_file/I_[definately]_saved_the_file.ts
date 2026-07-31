import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const definitelyTypoSelection = {
	segmentedSentenceId: "sentence_rD417V7LqeMN3YEjML" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "definately",
	selectedOrthography: "Typo",

	surface: {
		language: "en",
		normalizedSurface: "definitely",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "definitely",
			family: "Lexeme",
			kind: "ADV",
			coreFeatures: {
				abbr: null,
				extPos: null,
				numForm: null,
				numType: null,
				pronType: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Lexeme", "ADV">;

export const attestation = {
	selection: definitelyTypoSelection,
	sentenceMarkdown: "I [definately] saved the file.",
	classifierNotes:
		'Definately is a typo of definitely; mark only `selectedOrthography: "Typo"` here, not a spelling variant, because the intended resolved surface is canonical.',
} as const satisfies AttestedSelection;
