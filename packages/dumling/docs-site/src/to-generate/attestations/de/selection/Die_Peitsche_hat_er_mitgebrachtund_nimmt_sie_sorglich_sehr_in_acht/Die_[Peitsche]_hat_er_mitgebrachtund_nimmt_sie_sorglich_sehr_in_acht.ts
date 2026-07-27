import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "Peitsche",

	surface: {
		language: "de",
		normalizedFullSurface: "Peitsche",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "Peitsche",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Fem",
			},
			meaningInEmojis: "🪢",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Die [Peitsche] hat er mitgebracht
und nimmt sie sorglich sehr in acht.`,
	classifierNotes: "",
	isVerified: true,
} as const satisfies AttestedSelection;
