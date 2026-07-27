import type { AttestedSelection, Selection } from "dumling/types";

const loDubimVeloYaarSelection = {
	language: "he",
	spelledSelection: "לא דובים ולא יער",

	surface: {
		language: "he",
		normalizedFullSurface: "לא דובים ולא יער",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalLemma: "לא דובים ולא יער",
			lemmaKind: "Phraseme",
			lemmaSubKind: "Idiom",
			inherentFeatures: {},
			meaningInEmojis: "🫥",
		},
	},
} satisfies Selection<"he", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	selection: loDubimVeloYaarSelection,
	sentenceMarkdown: "הבטיחו דרמה, אבל [לא דובים ולא יער].",
	classifierNotes:
		"לא דובים ולא יער is classified as an idiom; it is proverb-like, but used here as a fixed idiomatic denial.",
} as const satisfies AttestedSelection;
