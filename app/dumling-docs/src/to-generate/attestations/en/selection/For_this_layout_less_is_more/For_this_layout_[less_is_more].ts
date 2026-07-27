import type { AttestedSelection, Selection } from "dumling/types";

const lessIsMoreAphorismSelection = {
	language: "en",
	spelledSelection: "less is more",

	surface: {
		language: "en",
		normalizedFullSurface: "less is more",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "less is more",
			lemmaKind: "Phraseme",
			lemmaSubKind: "Aphorism",
			inherentFeatures: {},
			meaningInEmojis: "➖",
		},
	},
} satisfies Selection<"en", "Citation", "Phraseme", "Aphorism">;

export const attestation = {
	selection: lessIsMoreAphorismSelection,
	sentenceMarkdown: "For this layout, [less is more].",
	classifierNotes:
		"Less is more is treated as an aphorism rather than a proverb because it states a maxim without narrative proverb form.",
} as const satisfies AttestedSelection;
