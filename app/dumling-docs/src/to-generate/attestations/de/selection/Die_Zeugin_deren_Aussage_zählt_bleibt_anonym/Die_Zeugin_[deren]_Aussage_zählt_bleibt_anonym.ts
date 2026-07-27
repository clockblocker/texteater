import type { AttestedSelection, Selection } from "dumling/types";

const deSelection032 = {
	language: "de",
	spelledSelection: "deren",

	surface: {
		language: "de",
		normalizedFullSurface: "deren",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Gen",
			gender: "Fem",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "der",
			lemmaKind: "Lexeme",
			lemmaSubKind: "PRON",
			inherentFeatures: {
				pronType: "Rel",
			},
			meaningInEmojis: "🔗",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: deSelection032,
	sentenceMarkdown: "Die Zeugin, [deren] Aussage zählt, bleibt anonym.",
	classifierNotes:
		"Deren is the feminine genitive singular counterpart to dessen in this context.",
	isVerified: true,
} as const satisfies AttestedSelection;
