import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "geschwind",

	surface: {
		language: "de",
		normalizedFullSurface: "geschwind",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "geschwind",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADV",
			inherentFeatures: {},
			meaningInEmojis: "⚡",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADV">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `nahm Ranzen, Pulverhorn und Flint
und lief hinaus ins Feld [geschwind]`,
	classifierNotes:
		"I treated `geschwind` here as an adverb meaning `quickly`, not as an adjective, because it modifies the running event directly and shows no adjectival inflection in this use.",
	isVerified: true,
} as const satisfies AttestedSelection;
