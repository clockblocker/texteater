import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_VWX7Q8sPV5qaSg76hi" as SegmentedSentenceId,
	clickedSegmentIndex: 15,
	surfaceSegmentIndices: [15],
	attestedSurface: "jämmerlich",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "jämmerlich",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "jämmerlich",
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
	selection: deSelection,
	sentenceMarkdown: `Und Minz und Maunz, die schreien
gar [jämmerlich] zu zweien`,
	classifierNotes:
		"Jämmerlich is adjective-shaped, but in this sentence it modifies schreien adverbially. I classified the attested use as ADV to reflect the learner-facing role in context.",
	isVerified: true,
} as const satisfies AttestedSelection;
