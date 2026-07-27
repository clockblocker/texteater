import type { AttestedSelection, Selection } from "dumling/types";

const leadNounHomographSelection = {
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
			lemmaSubKind: "NOUN",
			inherentFeatures: {},
			meaningInEmojis: "⚙️",
		},
	},
} satisfies Selection<"en", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: leadNounHomographSelection,
	sentenceMarkdown: "The pipe contained traces of [lead].",
	classifierNotes:
		"Material lead is a noun lexeme; pronunciation is not represented in the current model.",
} as const satisfies AttestedSelection;
