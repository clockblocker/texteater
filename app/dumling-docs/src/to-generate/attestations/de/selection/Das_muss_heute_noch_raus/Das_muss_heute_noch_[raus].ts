import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_A8_OOe2QI1rviHpdQJ" as SegmentedSentenceId,
	clickedSegmentIndex: 8,
	surfaceSegmentIndices: [8],
	attestedSurface: "raus",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "raus",
		spelling: "Variant",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "heraus",
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
	sentenceMarkdown: "Das muss heute noch [raus].",
	classifierNotes:
		"Raus is treated as the directional adverb with canonical lemma heraus. I did not fold it into a separable-verb analysis here, because the clause is elliptical and there is no overt finite verb like geht or muss-embedded infinitive host for a particle split.",
	isVerified: true,
} as const satisfies AttestedSelection;
