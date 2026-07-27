import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "acht",

	surface: {
		language: "de",
		normalizedFullSurface: "in acht nehmen",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "in acht nehmen",
			lemmaKind: "Phraseme",
			lemmaSubKind: "Idiom",
			inherentFeatures: {},
			meaningInEmojis: "👀",
		},
	},
} satisfies Selection<"de", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Die Peitsche hat er mitgebracht
und nimmt sie sorglich sehr in [acht].`,
	classifierNotes:
		"Acht is not the numeral here. It is the internal noun-shaped component of the fixed idiom in acht nehmen, so the selection points to the whole idiom.",
	isVerified: true,
} as const satisfies AttestedSelection;
