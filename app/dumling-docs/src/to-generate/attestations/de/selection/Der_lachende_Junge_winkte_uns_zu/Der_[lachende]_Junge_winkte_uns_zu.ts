import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_PywA4KVRbK79cvg3M3" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "lachende",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "lachende",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			gender: "Masc",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "lachend",
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
	selection: deSelection,
	sentenceMarkdown: "Der [lachende] Junge winkte uns zu.",
	classifierNotes:
		"Lachende is an attributive participial adjective modifying Junge with nominative masculine singular agreement. Under the repo's German participle rule, noun-modifying P1 forms like this classify as ADJ rather than VERB.",
	isVerified: true,
} as const satisfies AttestedSelection;
