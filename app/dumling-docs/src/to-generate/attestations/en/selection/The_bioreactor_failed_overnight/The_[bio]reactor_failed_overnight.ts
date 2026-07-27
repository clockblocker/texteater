import type { AttestedSelection, Selection } from "dumling/types";

const bioRootPartialSelection = {
	language: "en",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "bio",

	surface: {
		language: "en",
		normalizedFullSurface: "bio",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "bio",
			lemmaKind: "Morpheme",
			lemmaSubKind: "Root",
			inherentFeatures: {},
			meaningInEmojis: "🧬",
		},
	},
} satisfies Selection<"en", "Citation", "Morpheme", "Root">;

export const attestation = {
	selection: bioRootPartialSelection,
	sentenceMarkdown: "The [bio]reactor failed overnight.",
	classifierNotes:
		"Bio is modeled as a bound root in bioreactor, not as a free clipping of biography.",
} as const satisfies AttestedSelection;
