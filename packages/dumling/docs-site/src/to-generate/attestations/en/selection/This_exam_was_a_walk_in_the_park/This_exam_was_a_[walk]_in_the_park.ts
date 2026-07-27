import type { AttestedSelection, Selection } from "dumling/types";

const walkInTheParkSelection = {
	language: "en",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "walk",

	surface: {
		language: "en",
		normalizedFullSurface: "walk in the park",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "walk in the park",
			lemmaKind: "Phraseme",
			lemmaSubKind: "Idiom",
			inherentFeatures: {},
			meaningInEmojis: "😌",
		},
	},
} satisfies Selection<"en", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	selection: walkInTheParkSelection,
	sentenceMarkdown: "This exam was a [walk] in the park.",
} as const satisfies AttestedSelection;
