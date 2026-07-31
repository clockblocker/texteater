import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const emailVariantSelection = {
	segmentedSentenceId: "sentence_ktTxTklFP4e7lnGa0k" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "e-mail",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "e-mail",
		spelling: "Variant",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "email",
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
	selection: emailVariantSelection,
	sentenceMarkdown: "Send the [e-mail] before noon.",
	classifierNotes:
		"Hyphenated e-mail is a standard variant of email, not a typo.",
} as const satisfies AttestedSelection;
