import type { AttestedSelection, Selection } from "dumling/types";

const deSelection006 = {
	language: "de",
	spelledSelection: "Leiter",

	surface: {
		language: "de",
		normalizedFullSurface: "Leiter",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "Leiter",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Masc",
			},
			meaningInEmojis: "🧑‍💼",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection006,
	sentenceMarkdown: "Der [Leiter] der Werkstatt kam später.",
	classifierNotes:
		"Leiter is the person-role sense here, with masculine gender.",
	isVerified: true,
} as const satisfies AttestedSelection;
