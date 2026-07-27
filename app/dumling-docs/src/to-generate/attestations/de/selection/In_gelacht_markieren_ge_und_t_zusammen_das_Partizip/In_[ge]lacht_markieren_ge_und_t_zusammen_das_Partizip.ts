import type { AttestedSelection, Selection } from "dumling/types";

const deSelection051 = {
	language: "de",
	selectionFeatures: { coverage: "Partial", spelling: "Variant" },
	spelledSelection: "ge",

	surface: {
		language: "de",
		normalizedFullSurface: "ge-...-t",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "ge-...-t",
			lemmaKind: "Morpheme",
			lemmaSubKind: "Circumfix",
			inherentFeatures: {},
			meaningInEmojis: "🧬",
		},
	},
} satisfies Selection<"de", "Citation", "Morpheme", "Circumfix">;

export const attestation = {
	selection: deSelection051,
	sentenceMarkdown:
		"In [ge]lacht markieren ge- und -t zusammen das Partizip.",
	classifierNotes:
		"The circumfix is modeled as one morpheme even though the selected spelling shows only its first visible segment.",
	isVerified: true,
} as const satisfies AttestedSelection;
