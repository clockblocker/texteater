import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_DlTSMmD1EMt2pojm1D" as SegmentedSentenceId,
	clickedSegmentIndex: 8,
	surfaceSegmentIndices: [8],
	attestedSurface: "auf",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "auf",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "auf",
			family: "Lexeme",
			kind: "ADP",
			coreFeatures: {
				adpType: "Prep",
				abbr: null,
				extPos: null,
				foreign: null,
				governedCase: null,
				partType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADP">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Das rote Band lag [auf] dem Geschenk.",
	classifierNotes:
		"`auf` heads the ordinary locative prepositional phrase `auf dem Geschenk`, so it is a plain preposition, not part of the verb `liegen`. I left `governedCase` unset because `auf` is a two-way preposition and the schema stores that feature lexically rather than per attested token, even though this local phrase is dative.",
	isVerified: true,
} as const satisfies AttestedSelection;
