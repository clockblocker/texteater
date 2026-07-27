import type { AttestedSelection, Selection } from "dumling/types";

const accommodationTypoPartialSelection = {
	language: "en",
	selectionFeatures: { orthography: "Typo" },
	spelledSelection: "acommodation",

	surface: {
		language: "en",
		normalizedFullSurface: "accommodation",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "accommodation",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {},
			meaningInEmojis: "🏨",
		},
	},
} satisfies Selection<"en", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: accommodationTypoPartialSelection,
	sentenceMarkdown: "The sign advertised [acommodation] nearby.",
	classifierNotes:
		"Acommodation is represented as Typo with normalized surface accommodation; no edit-distance metadata exists.",
} as const satisfies AttestedSelection;
