import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_VWX7Q8sPV5qaSg76hi" as SegmentedSentenceId,
	clickedSegmentIndex: 13,
	surfaceSegmentIndices: [13],
	attestedSurface: "gar",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "gar",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "gar",
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
[gar] jämmerlich zu zweien`,
	classifierNotes:
		"Gar functions as an intensifier here. Dumling does not currently split German focus or degree particles into a separate subtype, so I classified it as ADV rather than PART.",
	isVerified: true,
} as const satisfies AttestedSelection;
