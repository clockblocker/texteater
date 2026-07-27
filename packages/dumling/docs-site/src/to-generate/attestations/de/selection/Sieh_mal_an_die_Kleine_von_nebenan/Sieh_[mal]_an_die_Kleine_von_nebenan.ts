import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	selectionFeatures: { spelling: "Variant" },
	spelledSelection: "mal",

	surface: {
		language: "de",
		normalizedFullSurface: "mal",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "einmal",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADV",
			inherentFeatures: {},
			meaningInEmojis: "1️⃣",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADV">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Sieh [mal] an, die Kleine von nebenan.",
	classifierNotes:
		"I treated mal as the colloquial reduced variant of adverb einmal. Even in the semi-formulaic frame sieh mal an, the learner-facing selected unit is still the standalone adverb rather than a larger discourse formula.",
} as const satisfies AttestedSelection;
