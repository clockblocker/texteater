import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "zweien",

	surface: {
		language: "de",
		normalizedFullSurface: "zweien",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
		},
		lemma: {
			language: "de",
			canonicalLemma: "zwei",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NUM",
			inherentFeatures: {
				numType: "Card",
			},
			meaningInEmojis: "2️⃣",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "NUM">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Und Minz und Maunz, die schreien
gar jämmerlich zu [zweien]`,
	classifierNotes:
		"I treated zweien as the dative inflected form of the cardinal numeral zwei inside the fixed phrase zu zweien, rather than as a pronoun-like item.",
	isVerified: true,
} as const satisfies AttestedSelection;
