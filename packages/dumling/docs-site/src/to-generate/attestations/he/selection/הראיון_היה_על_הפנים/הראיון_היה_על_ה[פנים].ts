import type { AttestedSelection, Selection } from "dumling/types";

const alHapanimIdiomSelection = {
	language: "he",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "פנים",

	surface: {
		language: "he",
		normalizedFullSurface: "על הפנים",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalLemma: "על הפנים",
			lemmaKind: "Phraseme",
			lemmaSubKind: "Idiom",
			inherentFeatures: {},
			meaningInEmojis: "😖",
		},
	},
} satisfies Selection<"he", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	selection: alHapanimIdiomSelection,
	sentenceMarkdown: "הראיון היה על ה[פנים].",
	classifierNotes:
		"פנים is a partial selection against the whole idiom על הפנים, not a noun attestation.",
} as const satisfies AttestedSelection;
