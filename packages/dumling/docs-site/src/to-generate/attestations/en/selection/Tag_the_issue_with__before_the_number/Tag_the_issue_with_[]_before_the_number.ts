import type { AttestedSelection, Selection } from "dumling/types";

const hashSymbolVariantSelection = {
	language: "en",
	spelledSelection: "#",

	surface: {
		language: "en",
		normalizedFullSurface: "#",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "number sign",
			lemmaKind: "Lexeme",
			lemmaSubKind: "SYM",
			inherentFeatures: {},
			meaningInEmojis: "#️⃣",
		},
	},
} satisfies Selection<"en", "Citation", "Lexeme", "SYM">;

export const attestation = {
	selection: hashSymbolVariantSelection,
	sentenceMarkdown: "Tag the issue with [#] before the number.",
	classifierNotes:
		"The symbol surface # points to a worded canonical lemma, number sign.",
} as const satisfies AttestedSelection;
