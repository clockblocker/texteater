import type { AttestedSelection, Selection } from "dumling/types";

const deSelection014 = {
	language: "de",
	spelledSelection: "Herzen",

	surface: {
		language: "de",
		normalizedFullSurface: "Herzen",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "Herz",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Neut",
			},
			meaningInEmojis: "❤️",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection014,
	sentenceMarkdown: "Sie folgte ihrem [Herzen].",
	classifierNotes:
		"Herzen is dative singular here, not plural, despite its weak-looking ending on a neuter noun.",
	isVerified: true,
} as const satisfies AttestedSelection;
