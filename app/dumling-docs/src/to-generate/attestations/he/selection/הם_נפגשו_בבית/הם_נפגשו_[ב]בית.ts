import type { AttestedSelection, Selection } from "dumling/types";

const bePrefixSelection = {
	language: "he",
	spelledSelection: "ב",

	surface: {
		language: "he",
		normalizedFullSurface: "ב",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalLemma: "ב",
			lemmaKind: "Morpheme",
			lemmaSubKind: "Prefix",
			inherentFeatures: {},
			meaningInEmojis: "📍",
		},
	},
} satisfies Selection<"he", "Citation", "Morpheme", "Prefix">;

export const attestation = {
	selection: bePrefixSelection,
	sentenceMarkdown: "הם נפגשו [ב]בית.",
	classifierNotes:
		"ב is treated as a prefix morpheme even though it corresponds semantically to a preposition.",
} as const satisfies AttestedSelection;
