import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_8dIHSMoDnLP6k1edao" as SegmentedSentenceId,
	clickedSegmentIndex: 20,
	surfaceSegmentIndices: [20],
	attestedSurface: "fünften",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "fünften",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			degree: "Pos",
			gender: "Masc",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "fünfte",
			family: "Lexeme",
			kind: "ADJ",
			coreFeatures: {
				numType: "Ord",
				abbr: null,
				foreign: null,
				variant: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Er wog vielleicht ein halbes Lot –
und war am [fünften] Tage tot.
`,
	classifierNotes:
		"Fünften is the dative masculine singular inflected form of the ordinal adjective fünfte in the temporal phrase am fünften Tage, so I modeled it as ADJ with ordinal number features rather than as a cardinal numeral.",
	isVerified: true,
} as const satisfies AttestedSelection;
