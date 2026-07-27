import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "verheiratet",

	surface: {
		language: "de",
		normalizedFullSurface: "verheiratet",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			aspect: "Perf",
			verbForm: "Part",
		},
		lemma: {
			language: "de",
			canonicalLemma: "verheiraten",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "💍",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Sie ist [verheiratet].",
	classifierNotes:
		"Verheiratet is treated here as a bare predicative Partizip-II form of verheiraten. Under the stricter German participle rule, non-attributive participles of lexical verbs stay VERB even when the clause expresses a stable resulting state.",
	isVerified: true,
} as const satisfies AttestedSelection;
