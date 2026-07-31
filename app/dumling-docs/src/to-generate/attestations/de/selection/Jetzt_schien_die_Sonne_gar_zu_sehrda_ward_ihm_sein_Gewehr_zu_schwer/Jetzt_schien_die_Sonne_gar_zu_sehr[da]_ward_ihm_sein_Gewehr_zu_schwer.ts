import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_NdOQJVsJNPbOeSZFKO" as SegmentedSentenceId,
	clickedSegmentIndex: 15,
	surfaceSegmentIndices: [15],
	attestedSurface: "da",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "da",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "da",
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
	sentenceMarkdown: `Jetzt schien die Sonne gar zu sehr,
[da] ward ihm sein Gewehr zu schwer.`,
	classifierNotes:
		"I treated `da` as a narrative temporal adverb meaning roughly `then`, not as the subordinating conjunction, because the clause stays V2 (`da ward ...`) instead of showing subordinate verb-final order.",
	isVerified: true,
} as const satisfies AttestedSelection;
