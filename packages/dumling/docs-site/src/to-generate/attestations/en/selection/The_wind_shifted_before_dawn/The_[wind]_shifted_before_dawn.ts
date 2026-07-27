import type { AttestedSelection, Selection } from "dumling/types";

const windNounHomographSelection = {
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
			lemmaSubKind: "NOUN",
			inherentFeatures: {},
			meaningInEmojis: "💨",
		},
	},
} satisfies Selection<"en", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: windNounHomographSelection,
	sentenceMarkdown: "The [wind] shifted before dawn.",
	classifierNotes:
		"Wind as weather is a noun citation surface sharing spelling with the verb wind.",
} as const satisfies AttestedSelection;
