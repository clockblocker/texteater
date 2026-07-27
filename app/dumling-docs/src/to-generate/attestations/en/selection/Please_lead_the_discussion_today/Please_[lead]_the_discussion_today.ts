import type { AttestedSelection, Selection } from "dumling/types";

const leadVerbHomographSelection = {
	language: "en",
	spelledSelection: "lead",

	surface: {
		language: "en",
		normalizedFullSurface: "lead",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "lead",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "🧭",
		},
	},
} satisfies Selection<"en", "Citation", "Lexeme", "VERB">;

export const attestation = {
	selection: leadVerbHomographSelection,
	sentenceMarkdown: "Please [lead] the discussion today.",
	classifierNotes:
		"Verb lead is kept separate from noun lead despite identical spelling.",
} as const satisfies AttestedSelection;
