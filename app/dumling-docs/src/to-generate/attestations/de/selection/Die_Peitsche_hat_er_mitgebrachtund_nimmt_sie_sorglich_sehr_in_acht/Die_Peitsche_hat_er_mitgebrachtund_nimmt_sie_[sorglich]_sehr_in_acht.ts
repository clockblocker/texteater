import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "sorglich",

	surface: {
		language: "de",
		normalizedFullSurface: "sorglich",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "sorglich",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADV",
			inherentFeatures: {},
			meaningInEmojis: "🛡️",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADV">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Die Peitsche hat er mitgebracht
und nimmt sie [sorglich] sehr in acht.`,
	classifierNotes:
		"Sorglich is a manner adverb here, even though the form can feel adjective-like in modern German because it is rare outside literary style.",
	isVerified: true,
} as const satisfies AttestedSelection;
