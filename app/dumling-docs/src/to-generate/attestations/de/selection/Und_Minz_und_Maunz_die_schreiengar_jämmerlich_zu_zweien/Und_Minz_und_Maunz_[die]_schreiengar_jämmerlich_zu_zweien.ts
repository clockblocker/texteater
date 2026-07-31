import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_VWX7Q8sPV5qaSg76hi" as SegmentedSentenceId,
	clickedSegmentIndex: 9,
	surfaceSegmentIndices: [9],
	attestedSurface: "die",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "die",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			number: "Plur",
			gender: null,
			reflex: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "der",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				pronType: "Rel",
				extPos: null,
				foreign: null,
				person: null,
				polite: null,
				poss: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Und Minz und Maunz, [die] schreien
gar jämmerlich zu zweien`,
	classifierNotes:
		"Die links the relative clause back to Minz und Maunz, so this is the nominative plural relative pronoun, not the article.",
	isVerified: true,
} as const satisfies AttestedSelection;
