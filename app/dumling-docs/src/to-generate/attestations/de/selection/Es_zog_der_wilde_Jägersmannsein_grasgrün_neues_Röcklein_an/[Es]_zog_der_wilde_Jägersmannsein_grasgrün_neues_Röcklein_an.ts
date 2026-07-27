import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
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
	selection: deSelection,
	sentenceMarkdown: `[Es] zog der wilde Jägersmann
		sein grasgrün neues Röcklein an;`,
	classifierNotes:
		"I treated sentence-initial `Es` as the personal pronoun lemma `es` with nominative neuter singular inflection. In this poetic inversion it may function as expletive or presentational `es`, but the current schema has no dedicated expletive feature, so plain PRON is the closest Dumling fit.",
	isVerified: true,
} as const satisfies AttestedSelection;
