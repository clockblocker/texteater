import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection027 = {
	segmentedSentenceId: "sentence_y2qqSTpB9zEL-8YJw3" as SegmentedSentenceId,
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [6],
	attestedSurface: "besseren",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "besseren",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Acc",
			degree: "Cmp",
			gender: "Masc",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "gut",
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
} satisfies Selection<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection027,
	sentenceMarkdown: "Ich suche einen [besseren] Ansatz.",
	classifierNotes:
		"Besseren is a comparative adjective with accusative masculine singular agreement.",
	isVerified: true,
} as const satisfies AttestedSelection;
