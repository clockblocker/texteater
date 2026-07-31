import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const verbranntParticipleSelection = {
	segmentedSentenceId: "sentence_RQHEa7a4JSv6Tb8uCY" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "Verbrannt",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "verbrannt",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			aspect: "Perf",
			verbForm: "Part",
			gender: null,
			mood: null,
			number: null,
			person: null,
			tense: null,
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "verbrennen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasGovPrep: null,
				hasSepPrefix: null,
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: verbranntParticipleSelection,
	sentenceMarkdown: `[Verbrannt] ist alles ganz und gar,
das arme Kind mit Haut und Haar;`,
	classifierNotes:
		"I treated Verbrannt as the participial verb form of verbrennen rather than as a plain adjective. A predicative-adjective reading is possible in German, but dumling-wise the learner-facing meaning here still points most directly to the lexical verb and its result-state participle.",
	isVerified: true,
} as const satisfies AttestedSelection;
