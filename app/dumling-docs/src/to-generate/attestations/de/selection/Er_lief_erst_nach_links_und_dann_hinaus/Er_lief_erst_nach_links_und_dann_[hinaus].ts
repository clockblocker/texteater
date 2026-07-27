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
	sentenceMarkdown: "Er lief erst nach links und dann [hinaus].",
	classifierNotes:
		"Hinaus is a standalone directional adverb here. The sequence `nach links und dann hinaus` makes the path expression contrastive and compositional rather than forcing a separable-verb reading.",
	isVerified: true,
} as const satisfies AttestedSelection;
