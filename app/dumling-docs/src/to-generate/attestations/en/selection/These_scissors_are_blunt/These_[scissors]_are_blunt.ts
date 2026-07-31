import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const scissorsPluralTantumSelection = {
	segmentedSentenceId: "sentence_kQD1L38oATY9CFuyu9" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "scissors",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "scissors",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Ptan",
		},
		lemma: {
			language: "en",
			canonicalForm: "scissors",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				abbr: null,
				extPos: null,
				foreign: null,
				numForm: null,
				numType: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: scissorsPluralTantumSelection,
	sentenceMarkdown: "These [scissors] are blunt.",
	classifierNotes:
		"Scissors uses Number=Ptan to stress plurale-tantum support.",
} as const satisfies AttestedSelection;
