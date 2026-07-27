import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "eingezeichnet",

	surface: {
		language: "de",
		normalizedFullSurface: "eingezeichnet",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			aspect: "Perf",
			verbForm: "Part",
		},
		lemma: {
			language: "de",
			canonicalLemma: "einzeichnen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {
				hasSepPrefix: "ein",
			},
			meaningInEmojis: "🗺️",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Auf der Karte sind drei Seen [eingezeichnet].",
	classifierNotes:
		"Eingezeichnet is treated as the perfect participle of separable einzeichnen. Under the current German rule, attributive participles like eingezeichneten in die eingezeichneten Seen go to ADJ, but this bare predicative Partizip-II form stays VERB despite the result-state reading.",
	isVerified: true,
} as const satisfies AttestedSelection;
