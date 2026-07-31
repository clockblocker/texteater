import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_pJroeJAAiSmYPgsKOZ" as SegmentedSentenceId,
	clickedSegmentIndex: 16,
	surfaceSegmentIndices: [16],
	attestedSurface: "sorglich",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "sorglich",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "sorglich",
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
	sentenceMarkdown: `Die Peitsche hat er mitgebracht
und nimmt sie [sorglich] sehr in acht.`,
	classifierNotes:
		"Sorglich is a manner adverb here, even though the form can feel adjective-like in modern German because it is rare outside literary style.",
	isVerified: true,
} as const satisfies AttestedSelection;
