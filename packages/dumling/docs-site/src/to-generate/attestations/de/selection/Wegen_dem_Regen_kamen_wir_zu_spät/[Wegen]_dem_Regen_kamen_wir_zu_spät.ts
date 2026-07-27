import type { AttestedSelection, Selection } from "dumling/types";

const deSelection037 = {
	language: "de",
	spelledSelection: "Wegen",

	surface: {
		language: "de",
		normalizedFullSurface: "wegen",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "wegen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADP",
			inherentFeatures: {
				adpType: "Prep",
				governedCase: "Gen",
			},
			meaningInEmojis: "🌧️",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADP">;

export const attestation = {
	selection: deSelection037,
	sentenceMarkdown: "[Wegen] dem Regen kamen wir zu spät.",
	classifierNotes:
		"This is the normative genitive-governing adposition even though the complement phrase is colloquially dative.",
	classificationMistakes:
		"`meaningInEmojis` points to the surrounding rain scene (`🌧️`) instead of to the selected adposition `wegen` itself.",
} as const satisfies AttestedSelection;
