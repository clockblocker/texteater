import type { AttestedSelection, Selection } from "dumling/types";

const llCliticPartialSelection = {
	language: "en",
	selectionFeatures: { coverage: "Partial", spelling: "Variant" },
	spelledSelection: "ll",

	surface: {
		language: "en",
		normalizedFullSurface: "ll",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "'ll",
			lemmaKind: "Morpheme",
			lemmaSubKind: "Clitic",
			inherentFeatures: {},
			meaningInEmojis: "🔮",
		},
	},
} satisfies Selection<"en", "Citation", "Morpheme", "Clitic">;

export const attestation = {
	selection: llCliticPartialSelection,
	sentenceMarkdown: "I'[ll] call when I arrive.",
	classifierNotes:
		'The apostrophe is outside the selected substring, so `selectionFeatures.spelling: "Variant"` marks the mismatch against the clitic lemma.',
} as const satisfies AttestedSelection;
