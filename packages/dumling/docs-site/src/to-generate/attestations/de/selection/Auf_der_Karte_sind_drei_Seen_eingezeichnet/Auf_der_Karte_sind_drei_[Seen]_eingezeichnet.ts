import type { AttestedSelection, Selection } from "dumling/types";

const deSelection001 = {
	language: "de",
	spelledSelection: "Seen",

	surface: {
		language: "de",
		normalizedFullSurface: "Seen",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			number: "Plur",
		},
		lemma: {
			language: "de",
			canonicalLemma: "See",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Masc",
			},
			meaningInEmojis: "🌊",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection001,
	sentenceMarkdown: "Auf der Karte sind drei [Seen] eingezeichnet.",
	classifierNotes:
		"Plural noun with masculine lemma See; the capitalized surface is normalized by the encoder.",
	isVerified: true,
} as const satisfies AttestedSelection;
