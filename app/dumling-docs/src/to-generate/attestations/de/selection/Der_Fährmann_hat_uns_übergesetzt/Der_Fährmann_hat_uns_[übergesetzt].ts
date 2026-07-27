import type { AttestedSelection, Selection } from "dumling/types";

const deSelection019 = {
	language: "de",
	spelledSelection: "übergesetzt",

	surface: {
		language: "de",
		normalizedFullSurface: "übergesetzt",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			aspect: "Perf",
			verbForm: "Part",
		},
		lemma: {
			language: "de",
			canonicalLemma: "übersetzen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "⛴️",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection019,
	sentenceMarkdown: "Der Fährmann hat uns [übergesetzt].",
	classifierNotes:
		"This is the ferry-across participle, with related spelling but a different sense.",
	isVerified: true,
} as const satisfies AttestedSelection;
