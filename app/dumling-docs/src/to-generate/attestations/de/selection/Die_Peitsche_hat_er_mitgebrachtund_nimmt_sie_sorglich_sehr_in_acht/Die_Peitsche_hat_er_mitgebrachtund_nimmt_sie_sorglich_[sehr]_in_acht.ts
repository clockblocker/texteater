import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_pJroeJAAiSmYPgsKOZ" as SegmentedSentenceId,
	clickedSegmentIndex: 18,
	surfaceSegmentIndices: [18],
	attestedSurface: "sehr",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "sehr",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "sehr",
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
und nimmt sie sorglich [sehr] in acht.`,
	classifierNotes:
		"Sehr functions as an intensifying adverb here; dumling does not currently split German degree particles away from ADV.",
	isVerified: true,
} as const satisfies AttestedSelection;
