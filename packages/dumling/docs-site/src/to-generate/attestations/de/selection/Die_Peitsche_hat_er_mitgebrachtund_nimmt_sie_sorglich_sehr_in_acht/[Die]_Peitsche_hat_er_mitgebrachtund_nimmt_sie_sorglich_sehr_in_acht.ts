import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "Die",

	surface: {
		language: "de",
		normalizedFullSurface: "die",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "der",
			lemmaKind: "Lexeme",
			lemmaSubKind: "DET",
			inherentFeatures: {
				definite: "Def",
				pronType: "Art",
			},
			meaningInEmojis: "🧩",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "DET">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `[Die] Peitsche hat er mitgebracht
und nimmt sie sorglich sehr in acht.`,
	classifierNotes:
		"Sentence-initial Die is the capitalized article form of der, not a pronoun; the determiner surface stays nominative singular here without encoding feminine gender.",
	classificationMistakes:
		'Do not mark ordinary sentence-initial capitalization as a spelling variant. For this row, the earlier mistake was `{ selectionFeatures: { spelling: "Variant" } }` even though `Die` is just the standard capitalized attested form at the start of the sentence.',
	isVerified: true,
} as const satisfies AttestedSelection;
