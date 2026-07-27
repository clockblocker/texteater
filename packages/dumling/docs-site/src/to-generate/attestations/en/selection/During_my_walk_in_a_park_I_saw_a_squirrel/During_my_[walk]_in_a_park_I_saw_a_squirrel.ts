import type { AttestedSelection, Selection } from "dumling/types";

const walkSelection = {
	language: "en",
	spelledSelection: "walk",

	surface: {
		language: "en",
		normalizedFullSurface: "walk",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "walk",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {},
			meaningInEmojis: "🚶",
		},
	},
} satisfies Selection<"en", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: walkSelection,
	sentenceMarkdown: "During my [walk] in a park, I saw a squirrel.",
} as const satisfies AttestedSelection;
