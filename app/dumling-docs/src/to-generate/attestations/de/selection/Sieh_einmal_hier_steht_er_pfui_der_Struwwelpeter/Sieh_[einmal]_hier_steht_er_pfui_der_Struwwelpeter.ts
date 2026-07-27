import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "einmal",

	surface: {
		language: "de",
		normalizedFullSurface: "einmal",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "einmal",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADV",
			inherentFeatures: {},
			meaningInEmojis: "1️⃣",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADV">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Sieh [einmal], hier steht er, 
pfui, der Struwwelpeter!`,
	classifierNotes:
		"I treated einmal here as an adverb rather than as part of a larger fixed expression with Sieh; in this line it functions like a discourse-softening or temporal adverbial token.",
} as const satisfies AttestedSelection;
