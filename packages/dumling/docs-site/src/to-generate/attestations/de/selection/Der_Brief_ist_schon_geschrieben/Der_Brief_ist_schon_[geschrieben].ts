import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "geschrieben",

	surface: {
		language: "de",
		normalizedFullSurface: "geschrieben",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			aspect: "Perf",
			verbForm: "Part",
		},
		lemma: {
			language: "de",
			canonicalLemma: "schreiben",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "✍️",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Der Brief ist schon [geschrieben].",
	classifierNotes:
		"Geschrieben is a bare predicative Partizip-II form of schreiben. Under the current German verb rule, non-attributive participles of lexical verbs stay VERB rather than shifting to ADJ.",
	isVerified: true,
} as const satisfies AttestedSelection;
