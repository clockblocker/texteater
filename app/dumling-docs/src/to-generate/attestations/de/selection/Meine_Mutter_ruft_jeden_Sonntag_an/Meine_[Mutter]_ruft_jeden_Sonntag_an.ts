import type { AttestedSelection, Selection } from "dumling/types";

const deSelection009 = {
	language: "de",
	spelledSelection: "Mutter",

	surface: {
		language: "de",
		normalizedFullSurface: "Mutter",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "Mutter",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Fem",
			},
			meaningInEmojis: "👩",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection009,
	sentenceMarkdown: "Meine [Mutter] ruft jeden Sonntag an.",
	classifierNotes: "This is the kinship noun Mutter.",
	isVerified: true,
} as const satisfies AttestedSelection;
