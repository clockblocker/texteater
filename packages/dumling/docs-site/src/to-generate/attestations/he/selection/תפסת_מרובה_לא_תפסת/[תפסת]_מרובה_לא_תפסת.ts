import type { AttestedSelection, Selection } from "dumling/types";

const tafastaMerubeSelection = {
	language: "he",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "תפסת",

	surface: {
		language: "he",
		normalizedFullSurface: "תפסת מרובה לא תפסת",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalLemma: "תפסת מרובה לא תפסת",
			lemmaKind: "Phraseme",
			lemmaSubKind: "Proverb",
			inherentFeatures: {},
			meaningInEmojis: "⚖️",
		},
	},
} satisfies Selection<"he", "Citation", "Phraseme", "Proverb">;

export const attestation = {
	selection: tafastaMerubeSelection,
	sentenceMarkdown: "[תפסת] מרובה לא תפסת.",
	classifierNotes:
		"This is a partial selection against a proverb, not a verb attestation for תפסת.",
} as const satisfies AttestedSelection;
