import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_8dIHSMoDnLP6k1edao" as SegmentedSentenceId,
	clickedSegmentIndex: 10,
	surfaceSegmentIndices: [10],
	attestedSurface: "Lot",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Lot",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Acc",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "Lot",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Neut",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Er wog vielleicht ein halbes [Lot] –
und war am fünften Tage tot.
`,
	classifierNotes:
		"I treated Lot as the neuter weight unit and annotated the noun as accusative singular because it is the measure complement of wog. The bare noun form itself is syncretic with the citation form, so the case decision comes from the clause, not from overt noun morphology.",
	isVerified: true,
} as const satisfies AttestedSelection;
