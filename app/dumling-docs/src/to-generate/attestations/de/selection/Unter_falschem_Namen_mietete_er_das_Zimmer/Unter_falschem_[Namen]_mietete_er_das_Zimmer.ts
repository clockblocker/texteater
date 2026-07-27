import type { AttestedSelection, Selection } from "dumling/types";

const deSelection015 = {
	language: "de",
	spelledSelection: "Namen",

	surface: {
		language: "de",
		normalizedFullSurface: "Namen",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "Name",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Masc",
			},
			meaningInEmojis: "🏷️",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection015,
	sentenceMarkdown: "Unter falschem [Namen] mietete er das Zimmer.",
	classifierNotes:
		"Namen is dative singular of the weak masculine noun Name, even though the surface could be plural elsewhere.",
	isVerified: true,
} as const satisfies AttestedSelection;
