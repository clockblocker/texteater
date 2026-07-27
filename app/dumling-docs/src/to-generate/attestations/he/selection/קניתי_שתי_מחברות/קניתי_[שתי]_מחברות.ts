import type { AttestedSelection, Selection } from "dumling/types";

const shteiNumeralSelection = {
	language: "he",
	spelledSelection: "שתי",

	surface: {
		language: "he",
		normalizedFullSurface: "שתי",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			definite: "Cons",
			gender: "Fem",
			number: "Dual",
		},
		lemma: {
			language: "he",
			canonicalLemma: "שתיים",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NUM",
			inherentFeatures: {},
			meaningInEmojis: "2️⃣",
		},
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "NUM">;

export const attestation = {
	selection: shteiNumeralSelection,
	sentenceMarkdown: "קניתי [שתי] מחברות.",
	classifierNotes:
		"שתי is the construct or feminine form of שתיים and is intentionally awkward for feature-boundary testing.",
} as const satisfies AttestedSelection;
