import type { AttestedSelection, Selection } from "dumling/types";

const ishSuffixPartialSelection = {
	language: "en",
	selectionFeatures: { coverage: "Partial", spelling: "Variant" },
	spelledSelection: "ish",

	surface: {
		language: "en",
		normalizedFullSurface: "-ish",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "-ish",
			lemmaKind: "Morpheme",
			lemmaSubKind: "Suffix",
			inherentFeatures: {},
			meaningInEmojis: "~",
		},
	},
} satisfies Selection<"en", "Citation", "Morpheme", "Suffix">;

export const attestation = {
	selection: ishSuffixPartialSelection,
	sentenceMarkdown: "The estimate was thirty[ish] minutes.",
	classifierNotes:
		"The suffix citation includes a leading hyphen, while the attested substring omits it.",
} as const satisfies AttestedSelection;
