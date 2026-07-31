import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_u_apOypWe1-NYl57Zs" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "mal",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "mal",
		spelling: "Variant",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "einmal",
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
	sentenceMarkdown: "Sieh [mal] an, die Kleine von nebenan.",
	classifierNotes:
		"I treated mal as the colloquial reduced variant of adverb einmal. Even in the semi-formulaic frame sieh mal an, the learner-facing selected unit is still the standalone adverb rather than a larger discourse formula.",
} as const satisfies AttestedSelection;
