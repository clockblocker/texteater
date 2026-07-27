import type { AttestedSelection, Selection } from "dumling/types";

const okVariantSelection = {
	language: "en",
	selectionFeatures: { spelling: "Variant" },
	spelledSelection: "OK",

	surface: {
		language: "en",
		normalizedFullSurface: "OK",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "okay",
			lemmaKind: "Lexeme",
			lemmaSubKind: "INTJ",
			inherentFeatures: {},
			meaningInEmojis: "👌",
		},
	},
} satisfies Selection<"en", "Citation", "Lexeme", "INTJ">;

export const attestation = {
	selection: okVariantSelection,
	sentenceMarkdown: "Is [OK] still acceptable here?",
	classifierNotes:
		"OK is treated as a standard spelling variant of the canonical lemma okay.",
} as const satisfies AttestedSelection;
