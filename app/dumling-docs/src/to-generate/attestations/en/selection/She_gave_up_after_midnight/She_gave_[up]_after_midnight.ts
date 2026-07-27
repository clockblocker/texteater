import type { AttestedSelection, Selection } from "dumling/types";

const upParticleSelection = {
	language: "en",
	spelledSelection: "up",

	surface: {
		language: "en",
		normalizedFullSurface: "up",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "up",
			lemmaKind: "Lexeme",
			lemmaSubKind: "PART",
			inherentFeatures: {},
			meaningInEmojis: "⬆️",
		},
	},
} satisfies Selection<"en", "Citation", "Lexeme", "PART">;

export const attestation = {
	selection: upParticleSelection,
	sentenceMarkdown: "She gave [up] after midnight.",
	classifierNotes:
		"Particle up in a phrasal verb is modeled as PART, separate from adposition and adverb uses.",
} as const satisfies AttestedSelection;
