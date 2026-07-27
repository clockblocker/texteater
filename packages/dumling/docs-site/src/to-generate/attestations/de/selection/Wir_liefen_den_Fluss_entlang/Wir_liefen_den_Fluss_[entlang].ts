import type { AttestedSelection, Selection } from "dumling/types";

const deSelection038 = {
	language: "de",
	spelledSelection: "entlang",

	surface: {
		language: "de",
		normalizedFullSurface: "entlang",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "entlang",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADP",
			inherentFeatures: {
				adpType: "Post",
				governedCase: "Acc",
			},
			meaningInEmojis: "🛤️",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADP">;

export const attestation = {
	selection: deSelection038,
	sentenceMarkdown: "Wir liefen den Fluss [entlang].",
	classifierNotes:
		"Entlang is treated as a postposition rather than an adverb because of its syntactic relation to den Fluss.",
	isVerified: true,
} as const satisfies AttestedSelection;
