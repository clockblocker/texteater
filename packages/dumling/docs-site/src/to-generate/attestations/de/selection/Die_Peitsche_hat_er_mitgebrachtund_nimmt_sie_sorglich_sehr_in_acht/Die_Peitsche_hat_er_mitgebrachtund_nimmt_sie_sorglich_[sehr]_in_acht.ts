import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "sehr",

	surface: {
		language: "de",
		normalizedFullSurface: "sehr",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "sehr",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADV",
			inherentFeatures: {},
			meaningInEmojis: "📈",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADV">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Die Peitsche hat er mitgebracht
und nimmt sie sorglich [sehr] in acht.`,
	classifierNotes:
		"Sehr functions as an intensifying adverb here; dumling does not currently split German degree particles away from ADV.",
	isVerified: true,
} as const satisfies AttestedSelection;
