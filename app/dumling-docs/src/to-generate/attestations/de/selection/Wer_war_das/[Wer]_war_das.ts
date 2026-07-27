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
				pronType: "Int",
			},
			meaningInEmojis: "❔",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "[Wer] war das?",
	classifierNotes:
		"Wer is an interrogative pronoun here because it asks for the identity of the referent rather than linking a clause back to an antecedent.",
	isVerified: true,
} as const satisfies AttestedSelection;
