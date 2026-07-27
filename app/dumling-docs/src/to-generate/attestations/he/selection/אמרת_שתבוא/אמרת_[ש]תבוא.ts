import type { AttestedSelection, Selection } from "dumling/types";

const shePrefixSelection = {
	language: "he",
	spelledSelection: "ש",

	surface: {
		language: "he",
		normalizedFullSurface: "ש",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalLemma: "ש",
			lemmaKind: "Morpheme",
			lemmaSubKind: "Prefix",
			inherentFeatures: {},
			meaningInEmojis: "🔗",
		},
	},
} satisfies Selection<"he", "Citation", "Morpheme", "Prefix">;

export const attestation = {
	selection: shePrefixSelection,
	sentenceMarkdown: "אמרת [ש]תבוא.",
	classifierNotes:
		"ש is modeled as the bound complementizer or relative-marker prefix morpheme.",
} as const satisfies AttestedSelection;
