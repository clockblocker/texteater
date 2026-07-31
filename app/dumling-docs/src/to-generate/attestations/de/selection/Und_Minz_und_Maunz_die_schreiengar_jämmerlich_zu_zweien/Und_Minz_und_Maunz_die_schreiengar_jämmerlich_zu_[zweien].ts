import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_VWX7Q8sPV5qaSg76hi" as SegmentedSentenceId,
	clickedSegmentIndex: 19,
	surfaceSegmentIndices: [19],
	attestedSurface: "zweien",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "zweien",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			gender: null,
			number: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "zwei",
			family: "Lexeme",
			kind: "NUM",
			coreFeatures: {
				numType: "Card",
				abbr: null,
				foreign: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "NUM">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Und Minz und Maunz, die schreien
gar jämmerlich zu [zweien]`,
	classifierNotes:
		"I treated zweien as the dative inflected form of the cardinal numeral zwei inside the fixed phrase zu zweien, rather than as a pronoun-like item.",
	isVerified: true,
} as const satisfies AttestedSelection;
