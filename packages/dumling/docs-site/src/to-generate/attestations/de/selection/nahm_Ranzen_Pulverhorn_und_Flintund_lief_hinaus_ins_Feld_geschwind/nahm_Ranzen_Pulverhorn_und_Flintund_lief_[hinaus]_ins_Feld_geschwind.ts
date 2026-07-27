import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "hinaus",

	surface: {
		language: "de",
		normalizedFullSurface: "hinaus",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "hinaus",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADV",
			inherentFeatures: {},
			meaningInEmojis: "➡️",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADV">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `nahm Ranzen, Pulverhorn und Flint
und lief [hinaus] ins Feld geschwind`,
	classificationMistakes:
		"I previously forced `hinaus` into the separable verb `hinauslaufen`. Under the stricter directional-item rule, this sentence is better analyzed as plain `laufen` plus the standalone directional adverb `hinaus`, because nothing in the form itself disambiguates toward the lexicalized verb.",
	classifierNotes:
		"Hinaus is treated as the standalone directional adverb here. In an ambiguous motion clause like `lief hinaus`, dumling now leans toward `Verb + directional adverb` unless the form itself or stronger context clearly forces a separable-verb analysis.",
	isVerified: true,
} as const satisfies AttestedSelection;
