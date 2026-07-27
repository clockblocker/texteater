import type { AttestedSelection, Selection } from "dumling/types";

const deSelection022 = {
	language: "de",
	spelledSelection: "gewesen",

	surface: {
		language: "de",
		normalizedFullSurface: "gewesen",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			aspect: "Perf",
			verbForm: "Part",
		},
		lemma: {
			language: "de",
			canonicalLemma: "sein",
			lemmaKind: "Lexeme",
			lemmaSubKind: "AUX",
			inherentFeatures: {},
			meaningInEmojis: "🧩",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "AUX">;

export const attestation = {
	selection: deSelection022,
	sentenceMarkdown: "Das wäre fast schief [gewesen].",
	classifierNotes:
		"Gewesen is treated as an AUX participle rather than a lexical verb.",
	isVerified: true,
} as const satisfies AttestedSelection;
