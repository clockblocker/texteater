import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "interessierter",

	surface: {
		language: "de",
		normalizedFullSurface: "interessierter",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			gender: "Masc",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "interessiert",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADJ",
			inherentFeatures: {},
			meaningInEmojis: "🧐",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Ein [interessierter] Leser fragte nach.",
	classifierNotes:
		"Interessierter is an attributive adjective inflection modifying Leser, with nominative masculine singular agreement. Because the head noun is overt, this is neither a substantivized noun reading nor a verbal participle entry for classification purposes.",
	isVerified: true,
} as const satisfies AttestedSelection;
