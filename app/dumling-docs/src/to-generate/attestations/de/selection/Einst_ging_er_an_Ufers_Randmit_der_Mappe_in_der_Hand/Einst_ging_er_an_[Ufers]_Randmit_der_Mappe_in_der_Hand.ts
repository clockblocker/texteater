import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "Ufers",

	surface: {
		language: "de",
		normalizedFullSurface: "Ufers",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Gen",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "Ufer",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Neut",
			},
			meaningInEmojis: "🌊",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Einst ging er an [Ufers] Rand
mit der Mappe in der Hand.`,
	classifierNotes:
		"`Ufers` is genitive singular of `Ufer`. In this poetic noun phrase, the genitive depends on `Rand` (`Ufers Rand`), not directly on the preposition `an`.",
	isVerified: true,
} as const satisfies AttestedSelection;
