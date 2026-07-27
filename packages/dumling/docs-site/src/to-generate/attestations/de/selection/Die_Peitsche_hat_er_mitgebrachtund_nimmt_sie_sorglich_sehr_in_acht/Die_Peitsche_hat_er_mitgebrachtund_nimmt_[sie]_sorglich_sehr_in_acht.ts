import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "sie",

	surface: {
		language: "de",
		normalizedFullSurface: "sie",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Acc",
			gender: "Fem",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "sie",
			lemmaKind: "Lexeme",
			lemmaSubKind: "PRON",
			inherentFeatures: {
				person: "3",
				pronType: "Prs",
			},
			meaningInEmojis: "👉",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Die Peitsche hat er mitgebracht
und nimmt [sie] sorglich sehr in acht.`,
	classifierNotes:
		"Sie is the accusative feminine singular object pronoun referring back to Peitsche, not nominative plural or polite Sie.",
	isVerified: true,
} as const satisfies AttestedSelection;
