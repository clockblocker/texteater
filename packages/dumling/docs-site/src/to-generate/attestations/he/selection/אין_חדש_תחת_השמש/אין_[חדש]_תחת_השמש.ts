import type { AttestedSelection, Selection } from "dumling/types";

const einChadashTachatSelection = {
	language: "he",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "חדש",

	surface: {
		language: "he",
		normalizedFullSurface: "אין חדש תחת השמש",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalLemma: "אין חדש תחת השמש",
			lemmaKind: "Phraseme",
			lemmaSubKind: "Proverb",
			inherentFeatures: {},
			meaningInEmojis: "☀️",
		},
	},
} satisfies Selection<"he", "Citation", "Phraseme", "Proverb">;

export const attestation = {
	selection: einChadashTachatSelection,
	sentenceMarkdown: "אין [חדש] תחת השמש.",
	classifierNotes:
		"This is a partial selection against a proverb, not an adjective surface.",
} as const satisfies AttestedSelection;
