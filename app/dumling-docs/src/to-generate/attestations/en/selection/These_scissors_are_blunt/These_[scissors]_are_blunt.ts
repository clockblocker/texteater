import type { AttestedSelection, Selection } from "dumling/types";

const scissorsPluralTantumSelection = {
	language: "en",
	spelledSelection: "scissors",

	surface: {
		language: "en",
		normalizedFullSurface: "scissors",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Ptan",
		},
		lemma: {
			language: "en",
			canonicalLemma: "scissors",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {},
			meaningInEmojis: "✂️",
		},
	},
} satisfies Selection<"en", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: scissorsPluralTantumSelection,
	sentenceMarkdown: "These [scissors] are blunt.",
	classifierNotes:
		"Scissors uses Number=Ptan to stress plurale-tantum support.",
} as const satisfies AttestedSelection;
