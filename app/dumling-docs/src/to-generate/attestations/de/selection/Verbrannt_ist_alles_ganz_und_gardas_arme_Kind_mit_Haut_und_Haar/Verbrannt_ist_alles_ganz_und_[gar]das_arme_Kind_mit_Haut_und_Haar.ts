import type { AttestedSelection, Selection } from "dumling/types";

const ganzUndGarIdiomSelection = {
	language: "de",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "gar",

	surface: {
		language: "de",
		normalizedFullSurface: "ganz und gar",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "ganz und gar",
			lemmaKind: "Phraseme",
			lemmaSubKind: "Idiom",
			inherentFeatures: {},
			meaningInEmojis: "💯",
		},
	},
} satisfies Selection<"de", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	selection: ganzUndGarIdiomSelection,
	sentenceMarkdown: `Verbrannt ist alles ganz und [gar],
das arme Kind mit Haut und Haar;`,
	classifierNotes:
		"Gar can often be a standalone intensifying adverb, and there is another attestation in the repo where that is the best choice. Here I preferred a partial selection of the fixed phrase ganz und gar because the phrase as a whole carries the intended meaning.",
	isVerified: true,
} as const satisfies AttestedSelection;
