import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "Reisende",

	surface: {
		language: "de",
		normalizedFullSurface: "Reisende",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "Reisende",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Masc",
			},
			meaningInEmojis: "🧳",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Der [Reisende] wartete draußen.",
	classifierNotes:
		"Reisende is treated here as a substantivized present participle, so the learner-facing unit is a noun rather than an adjective or verb. The selected form is already citation-shaped for this nominal reading, so it stays `Surface/Citation`.",
	isVerified: true,
} as const satisfies AttestedSelection;
