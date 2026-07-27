import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "ungelöst",

	surface: {
		language: "de",
		normalizedFullSurface: "ungelöst",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			aspect: "Perf",
			verbForm: "Part",
		},
		lemma: {
			language: "de",
			canonicalLemma: "lösen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "🧩",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Die Aufgabe bleibt [ungelöst].",
	classifierNotes:
		"Ungelöst is treated here as a bare predicative Partizip-II form of lösen. Even though bleibt ungelöst strongly suggests a state reading, the stricter German participle rule keeps non-attributive participles of lexical verbs under VERB rather than shifting them to ADJ.",
	isVerified: true,
} as const satisfies AttestedSelection;
