import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_9alBueOx8NzauwT3b4" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "Verletzter",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Verletzter",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Verletzter",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Ein [Verletzter] lag am Straßenrand.",
	classifierNotes:
		"Verletzter is a substantivized participial form used as a noun here. The highlighted form is already citation-shaped for this nominal reading, so it stays `Surface/Citation` and is classified as `NOUN` rather than `ADJ` or `VERB`.",
	isVerified: true,
} as const satisfies AttestedSelection;
