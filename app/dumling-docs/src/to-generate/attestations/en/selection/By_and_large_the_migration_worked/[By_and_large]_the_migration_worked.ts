import type { AttestedSelection, Selection } from "dumling/types";

const byAndLargeIdiomSelection = {
	language: "en",
	spelledSelection: "By and large",

	surface: {
		language: "en",
		normalizedFullSurface: "by and large",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "by and large",
			lemmaKind: "Phraseme",
			lemmaSubKind: "Idiom",
			inherentFeatures: {},
			meaningInEmojis: "📌",
		},
	},
} satisfies Selection<"en", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	selection: byAndLargeIdiomSelection,
	sentenceMarkdown: "[By and large], the migration worked.",
	classifierNotes:
		"Sentence-initial capitalization is preserved only in spelledSelection.",
} as const satisfies AttestedSelection;
