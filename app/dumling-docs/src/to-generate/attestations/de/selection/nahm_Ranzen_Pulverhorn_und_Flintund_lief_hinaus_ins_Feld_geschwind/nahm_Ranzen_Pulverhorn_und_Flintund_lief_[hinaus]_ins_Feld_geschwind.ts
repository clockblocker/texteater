import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_qzvigr_CqXneesTaG-" as SegmentedSentenceId,
	clickedSegmentIndex: 15,
	surfaceSegmentIndices: [15],
	attestedSurface: "hinaus",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "hinaus",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "hinaus",
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
	sentenceMarkdown: `nahm Ranzen, Pulverhorn und Flint
und lief [hinaus] ins Feld geschwind`,
	classificationMistakes:
		"I previously forced `hinaus` into the separable verb `hinauslaufen`. Under the stricter directional-item rule, this sentence is better analyzed as plain `laufen` plus the standalone directional adverb `hinaus`, because nothing in the form itself disambiguates toward the lexicalized verb.",
	classifierNotes:
		"Hinaus is treated as the standalone directional adverb here. In an ambiguous motion clause like `lief hinaus`, dumling now leans toward `Verb + directional adverb` unless the form itself or stronger context clearly forces a separable-verb analysis.",
	isVerified: true,
} as const satisfies AttestedSelection;
