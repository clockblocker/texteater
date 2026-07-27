import type { AttestedSelection, Selection } from "dumling/types";

const windVerbHomographSelection = {
	language: "en",
	spelledSelection: "wind",

	surface: {
		language: "en",
		normalizedFullSurface: "wind",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "wind",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "🕰️",
		},
	},
} satisfies Selection<"en", "Citation", "Lexeme", "VERB">;

export const attestation = {
	selection: windVerbHomographSelection,
	sentenceMarkdown: "Could you [wind] the old clock?",
	classifierNotes:
		"Wind as a verb is modeled separately from wind as weather; pronunciation contrast is outside the object.",
} as const satisfies AttestedSelection;
