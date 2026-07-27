import type { AttestedSelection, Selection } from "dumling/types";

const deSelection029 = {
	language: "de",
	spelledSelection: "linke",

	surface: {
		language: "de",
		normalizedFullSurface: "linke",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			gender: "Fem",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "links",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADJ",
			inherentFeatures: {},
			meaningInEmojis: "⬅️",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection029,
	sentenceMarkdown: "Die [linke] Hand zitterte.",
	classifierNotes:
		"This is ordinary adjective agreement, included to contrast the directional adjective with political and proper-noun readings.",
	isVerified: true,
} as const satisfies AttestedSelection;
