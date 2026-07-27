import type { AttestedSelection, Selection } from "dumling/types";

const ganzUndGarIdiomSelection = {
	language: "de",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "ganz",

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
	sentenceMarkdown: `Verbrannt ist alles [ganz] und gar,
das arme Kind mit Haut und Haar;`,
	classifierNotes:
		"I treated ganz as a partial selection of the fixed intensifying idiom ganz und gar, not as the standalone adjective or adverb lexeme. In this line the learner-relevant meaning-bearing unit is the whole phrase meaning completely.",
	isVerified: true,
} as const satisfies AttestedSelection;
