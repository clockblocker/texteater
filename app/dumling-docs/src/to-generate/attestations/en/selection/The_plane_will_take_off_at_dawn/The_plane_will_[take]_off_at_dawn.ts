import type { AttestedSelection, Selection } from "dumling/types";

const takeOffParticlePartialSelection = {
	language: "en",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "take",

	surface: {
		language: "en",
		normalizedFullSurface: "take off",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "take off",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {
				phrasal: "Yes",
			},
			meaningInEmojis: "🛫",
		},
	},
} satisfies Selection<"en", "Citation", "Lexeme", "VERB">;

export const attestation = {
	selection: takeOffParticlePartialSelection,
	sentenceMarkdown: "The plane will [take] off at dawn.",
	classifierNotes:
		"Only the verb component is selected, but the lemma and surface are the phrasal verb take off.",
} as const satisfies AttestedSelection;
