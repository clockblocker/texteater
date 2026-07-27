import type { AttestedSelection, Selection } from "dumling/types";

const verbranntParticipleSelection = {
	language: "de",
	spelledSelection: "Verbrannt",

	surface: {
		language: "de",
		normalizedFullSurface: "verbrannt",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			aspect: "Perf",
			verbForm: "Part",
		},
		lemma: {
			language: "de",
			canonicalLemma: "verbrennen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "🔥",
		},
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
