import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_8dIHSMoDnLP6k1edao" as SegmentedSentenceId,
	clickedSegmentIndex: 24,
	surfaceSegmentIndices: [24],
	attestedSurface: "tot",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "tot",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "tot",
			family: "Lexeme",
			kind: "ADJ",
			coreFeatures: {
				abbr: null,
				foreign: null,
				numType: null,
				variant: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Er wog vielleicht ein halbes Lot –
und war am fünften Tage [tot].
`,
	classifierNotes:
		"Predicative tot is stored as a citation-shaped adjective because there is no overt inflection on the selected form.",
	isVerified: true,
} as const satisfies AttestedSelection;
