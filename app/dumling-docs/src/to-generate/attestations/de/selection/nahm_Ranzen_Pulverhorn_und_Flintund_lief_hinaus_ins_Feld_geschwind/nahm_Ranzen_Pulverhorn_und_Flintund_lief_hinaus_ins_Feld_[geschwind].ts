import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_qzvigr_CqXneesTaG-" as SegmentedSentenceId,
	clickedSegmentIndex: 21,
	surfaceSegmentIndices: [21],
	attestedSurface: "geschwind",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "geschwind",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "geschwind",
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
	sentenceMarkdown: `nahm Ranzen, Pulverhorn und Flint
und lief hinaus ins Feld [geschwind]`,
	classifierNotes:
		"I treated `geschwind` here as an adverb meaning `quickly`, not as an adjective, because it modifies the running event directly and shows no adjectival inflection in this use.",
	isVerified: true,
} as const satisfies AttestedSelection;
