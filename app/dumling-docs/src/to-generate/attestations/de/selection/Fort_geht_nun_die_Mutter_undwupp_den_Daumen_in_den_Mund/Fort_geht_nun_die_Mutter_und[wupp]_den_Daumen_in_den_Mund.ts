import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_aK7pKbYwdVWR_D7u3k" as SegmentedSentenceId,
	clickedSegmentIndex: 12,
	surfaceSegmentIndices: [12],
	attestedSurface: "wupp",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "wupp",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "wupp",
			family: "Lexeme",
			kind: "INTJ",
			coreFeatures: {
				partType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "INTJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Fort geht nun die Mutter und
[wupp]! den Daumen in den Mund.
`,
	classifierNotes:
		"Wupp looks like an exclamatory sound-effect item, so I treated it as a plain interjection. I did not model it as a discourse formula because there is no larger fixed phrase to recover, and I did not force `partType: Res` because this is an expressive exclamation rather than a response particle.",
	isVerified: true,
} as const satisfies AttestedSelection;
