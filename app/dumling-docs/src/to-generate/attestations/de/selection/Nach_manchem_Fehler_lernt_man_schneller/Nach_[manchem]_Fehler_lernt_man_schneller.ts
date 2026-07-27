import type { AttestedSelection, Selection } from "dumling/types";

const deSelection036 = {
	language: "de",
	spelledSelection: "manchem",

	surface: {
		language: "de",
		normalizedFullSurface: "manchem",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			gender: "Masc",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "manch",
			lemmaKind: "Lexeme",
			lemmaSubKind: "DET",
			inherentFeatures: {
				pronType: "Ind",
			},
			meaningInEmojis: "🎲",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "DET">;

export const attestation = {
	selection: deSelection036,
	sentenceMarkdown: "Nach [manchem] Fehler lernt man schneller.",
	classifierNotes:
		"Manchem is annotated as DET because it modifies Fehler; it would be PRON only in substantive use.",
	isVerified: true,
} as const satisfies AttestedSelection;
