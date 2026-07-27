import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "Rennen",

	surface: {
		language: "de",
		normalizedFullSurface: "Rennen",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "Rennen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Neut",
			},
			meaningInEmojis: "🏁",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Das [Rennen] hat Spaß gemacht.",
	classifierNotes:
		"Rennen is treated here as a substantivized infinitive used as a neuter noun. Following the repo's nominalized-verb rule and the existing Meckern example, the learner-facing unit is NOUN rather than the verb rennen.",
	isVerified: true,
} as const satisfies AttestedSelection;
