import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "anders",

	surface: {
		language: "de",
		normalizedFullSurface: "anders",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "anders",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADJ",
			inherentFeatures: {},
			meaningInEmojis: "🔀",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Am nächsten Morgen war alles [anders].",
	classifierNotes:
		"Anders is treated as a citation-shaped adjective in predicative use because it is the complement of sein and predicates over alles, not over the event. Even though it can feel adverb-like in English glossing, dumling's German patterns classify comparable predicative forms like tot and entzwei as ADJ rather than ADV.",
	isVerified: true,
} as const satisfies AttestedSelection;
