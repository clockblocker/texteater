import type { AttestedSelection, Selection } from "dumling/types";

const deSelection010 = {
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
			meaningInEmojis: "🔩",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection010,
	sentenceMarkdown: "Die [Mutter] passt nicht auf diese Schraube.",
	classifierNotes:
		"This is the hardware sense Mutter; lexical features match the kinship noun, so the distinction rests on the intended sense.",
	isVerified: true,
} as const satisfies AttestedSelection;
