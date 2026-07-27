import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "Wer",

	surface: {
		language: "de",
		normalizedFullSurface: "wer",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "wer",
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
	selection: deSelection,
	sentenceMarkdown: "[Wer] zuerst kommt, mahlt zuerst.",
	classifierNotes:
		"Wer heads a free relative clause here, so it is classified as a relative pronoun rather than an interrogative one.",
	isVerified: true,
} as const satisfies AttestedSelection;
