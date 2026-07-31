import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection037 = {
	segmentedSentenceId: "sentence_s9DZmf_EwGCIkah94_" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "Wegen",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "wegen",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "wegen",
			family: "Lexeme",
			kind: "ADP",
			coreFeatures: {
				adpType: "Prep",
				governedCase: "Gen",
				abbr: null,
				extPos: null,
				foreign: null,
				partType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADP">;

export const attestation = {
	selection: deSelection037,
	sentenceMarkdown: "[Wegen] dem Regen kamen wir zu spät.",
	classifierNotes:
		"This is the normative genitive-governing adposition even though the complement phrase is colloquially dative.",
	classificationMistakes:
		"Meaning belongs to a later layer; this Dumling attestation only resolves the selected adposition `wegen`.",
} as const satisfies AttestedSelection;
