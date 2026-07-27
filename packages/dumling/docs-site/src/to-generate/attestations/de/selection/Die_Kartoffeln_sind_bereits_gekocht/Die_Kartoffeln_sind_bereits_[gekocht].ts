import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "gekocht",

	surface: {
		language: "de",
		normalizedFullSurface: "gekocht",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			aspect: "Perf",
			verbForm: "Part",
		},
		lemma: {
			language: "de",
			canonicalLemma: "kochen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "🍳",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Die Kartoffeln sind bereits [gekocht].",
	classifierNotes:
		"Gekocht is a bare predicative Partizip-II form of kochen. Even though the clause describes a resulting state, the current German participle rule keeps non-attributive participles of lexical verbs under VERB rather than shifting them to ADJ.",
	isVerified: true,
} as const satisfies AttestedSelection;
