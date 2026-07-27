import type { AttestedSelection, Selection } from "dumling/types";

const esPronounSelection = {
	language: "de",
	spelledSelection: "Es",

	surface: {
		language: "de",
		normalizedFullSurface: "es",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			gender: "Neut",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "es",
			lemmaKind: "Lexeme",
			lemmaSubKind: "PRON",
			inherentFeatures: {
				person: "3",
				pronType: "Prs",
			},
			meaningInEmojis: "🫥",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: esPronounSelection,
	sentenceMarkdown: `[Es] brennt die Hand, es brennt das Haar,
es brennt das ganze Kind sogar.`,
	classifierNotes:
		"Sentence-initial Es is capitalized in spelledSelection but normalizedFullSurface stays lowercase. I treated it as nominative personal-pronoun es in an expletive or presentational use with a postponed nominative subject, rather than as a referential neuter pronoun.",
	isVerified: true,
} as const satisfies AttestedSelection;
