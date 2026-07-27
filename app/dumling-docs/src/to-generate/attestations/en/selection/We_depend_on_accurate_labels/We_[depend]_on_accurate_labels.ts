import type { AttestedSelection, Selection } from "dumling/types";

const dependOnGovernedPrepSelection = {
	language: "en",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "depend",

	surface: {
		language: "en",
		normalizedFullSurface: "depend on",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "depend on",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {
				hasGovPrep: "on",
			},
			meaningInEmojis: "🔗",
		},
	},
} satisfies Selection<"en", "Citation", "Lexeme", "VERB">;

export const attestation = {
	selection: dependOnGovernedPrepSelection,
	sentenceMarkdown: "We [depend] on accurate labels.",
	classifierNotes:
		"Depend on uses hasGovPrep rather than phrasal because on is governed by the verb.",
} as const satisfies AttestedSelection;
