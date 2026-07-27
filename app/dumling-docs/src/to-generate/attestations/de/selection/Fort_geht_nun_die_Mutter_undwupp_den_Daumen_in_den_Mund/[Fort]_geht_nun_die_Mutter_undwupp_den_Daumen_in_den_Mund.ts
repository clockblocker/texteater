import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "Fort",

	surface: {
		language: "de",
		normalizedFullSurface: "fort",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "fort",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADV",
			inherentFeatures: {},
			meaningInEmojis: "➡️",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADV">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `[Fort] geht nun die Mutter und
wupp! den Daumen in den Mund.
`,
	classificationMistakes:
		"I previously over-read `Fort` as a partial selection of the separable verb `fortgehen`. Under the stricter directional-item rule, this line is better kept as plain `gehen` plus the standalone directional adverb `fort`, because the form itself does not force the lexicalized verb analysis.",
	classifierNotes:
		"Fort is treated as the standalone directional adverb here. Even with the overt motion verb `geht`, the fronted `Fort geht ...` sequence does not by itself force the lexicalized separable verb `fortgehen`, so dumling keeps the compositional `gehen` + directional-adverb analysis.",
	isVerified: true,
} as const satisfies AttestedSelection;
