import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "an",

	surface: {
		language: "de",
		normalizedFullSurface: "an",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "an",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADP",
			inherentFeatures: {
				adpType: "Prep",
			},
			meaningInEmojis: "📍",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADP">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Einst ging er [an] Ufers Rand
mit der Mappe in der Hand.`,
	classifierNotes:
		"`an` is the ordinary two-way preposition. I left `governedCase` unset because this schema only accepts one value there, while the lexeme alternates between accusative and dative and the local context is not decisive enough to hard-code one on the lemma itself.",
	isVerified: true,
} as const satisfies AttestedSelection;
