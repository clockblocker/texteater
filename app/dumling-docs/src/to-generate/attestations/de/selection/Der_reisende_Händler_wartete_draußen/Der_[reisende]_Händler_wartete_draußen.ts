import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "reisende",

	surface: {
		language: "de",
		normalizedFullSurface: "reisende",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			gender: "Masc",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "reisend",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADJ",
			inherentFeatures: {},
			meaningInEmojis: "🧳",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Der [reisende] Händler wartete draußen.",
	classifierNotes:
		"Reisende is an attributive participial adjective modifying Haendler, with nominative masculine singular agreement. Because the head noun is overt, this is classified as ADJ rather than as the substantivized NOUN analysis used in Der Reisende wartete draussen.",
	isVerified: true,
} as const satisfies AttestedSelection;
