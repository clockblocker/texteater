import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection043 = {
	segmentedSentenceId: "sentence_G8Gdu93MBF0pVeYwbb" as SegmentedSentenceId,
	clickedSegmentIndex: 12,
	surfaceSegmentIndices: [6, 10, 12],
	attestedSurface: "verstehe nur Bahnhof",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "verstehe nur Bahnhof",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "1",
			tense: "Pres",
			verbForm: "Fin",
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "nur Bahnhof verstehen",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Phraseme", "Idiom">;

export const attestation = {
	selection: deSelection043,
	sentenceMarkdown: "Bei dieser Formel verstehe ich nur [Bahnhof].",
	classifierNotes:
		"Clicking Bahnhof resolves the complete discontinuous idiom occurrence `verstehe … nur Bahnhof`; `ich` lies between participating Text segments but is not a Surface member.",
	isVerified: true,
} as const satisfies AttestedSelection;
