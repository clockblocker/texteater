import type { AttestedSelection, Selection } from "dumling/types";

const bvgAbbreviationSelection = {
	language: "de",
	spelledSelection: "BVG",

	surface: {
		language: "de",
		normalizedFullSurface: "BVG",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "BVG",
			lemmaKind: "Lexeme",
			lemmaSubKind: "PROPN",
			inherentFeatures: {
				abbr: "Yes",
			},
			meaningInEmojis: "🚇",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "PROPN">;

export const attestation = {
	selection: bvgAbbreviationSelection,
	sentenceMarkdown: "In Berlin betreibt die [BVG] die U-Bahn.",
	classifierNotes:
		"`BVG` is a proper-noun abbreviation, so `abbr: \"Yes\"` belongs on the lemma's inherent feature bag.",
} as const satisfies AttestedSelection;
