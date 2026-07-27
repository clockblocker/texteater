import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "hinauszulaufen",

	surface: {
		language: "de",
		normalizedFullSurface: "hinauszulaufen",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			verbForm: "Inf",
		},
		lemma: {
			language: "de",
			canonicalLemma: "hinauslaufen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {
				hasSepPrefix: "hinaus",
			},
			meaningInEmojis: "🏃",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Er versucht, [hinauszulaufen].",
	classifierNotes:
		"The infinitive spelling `hinauszulaufen` directly exposes the separable verb lemma `hinauslaufen`, so this is an unambiguous verbal inflection rather than a standalone directional adverb.",
	isVerified: true,
} as const satisfies AttestedSelection;
