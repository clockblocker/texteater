import type { AttestedSelection, Selection } from "dumling/types";

const ganzUndGarIdiomSelection = {
	language: "de",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "und",

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
	sentenceMarkdown: `Verbrannt ist alles ganz [und] gar,
das arme Kind mit Haut und Haar;`,
	classifierNotes:
		"The tempting word-level analysis would be CCONJ und, but here und is internal to the frozen intensifier ganz und gar. I therefore kept the learner-facing unit as a partial idiom selection.",
	isVerified: true,
} as const satisfies AttestedSelection;
