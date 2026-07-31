import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const sogarAdverbSelection = {
	segmentedSentenceId: "sentence_sz9vPqpI5wFjuc-oLv" as SegmentedSentenceId,
	clickedSegmentIndex: 28,
	surfaceSegmentIndices: [28],
	attestedSurface: "sogar",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "sogar",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "sogar",
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
	selection: sogarAdverbSelection,
	sentenceMarkdown: `Es brennt die Hand, es brennt das Haar,
es brennt das ganze Kind [sogar].`,
	classifierNotes:
		"Sogar is the scalar focus item here. The current dumling inventory does not give German focus particles a dedicated subtype, so I classified it as ADV rather than inventing a particle-specific analysis.",
	isVerified: true,
} as const satisfies AttestedSelection;
