import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "in",

	surface: {
		language: "de",
		normalizedFullSurface: "in acht nehmen",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "in acht nehmen",
			lemmaKind: "Phraseme",
			lemmaSubKind: "Idiom",
			inherentFeatures: {},
			meaningInEmojis: "👀",
		},
	},
} satisfies Selection<"de", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Die Peitsche hat er mitgebracht
und nimmt sie sorglich sehr [in] acht.`,
	classifierNotes:
		"I treated in as part of the idiom in acht nehmen rather than as a free adposition, because the phrase is functioning as one fixed learner-facing unit here.",
	isVerified: true,
} as const satisfies AttestedSelection;
