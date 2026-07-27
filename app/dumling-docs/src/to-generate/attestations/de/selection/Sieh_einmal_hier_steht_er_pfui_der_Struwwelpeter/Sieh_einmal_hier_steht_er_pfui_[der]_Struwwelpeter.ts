import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "der",

	surface: {
		language: "de",
		normalizedFullSurface: "der",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			gender: "Masc",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "der",
			lemmaKind: "Lexeme",
			lemmaSubKind: "DET",
			inherentFeatures: {
				definite: "Def",
				pronType: "Art",
			},
			meaningInEmojis: "🧩",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "DET">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Sieh einmal, hier steht er, 
pfui, [der] Struwwelpeter!`,
	classifierNotes:
		"This der is the definite article introducing Struwwelpeter, not a standalone pronoun, so it stays DET even though it precedes a name-like label.",
	isVerified: true,
} as const satisfies AttestedSelection;
