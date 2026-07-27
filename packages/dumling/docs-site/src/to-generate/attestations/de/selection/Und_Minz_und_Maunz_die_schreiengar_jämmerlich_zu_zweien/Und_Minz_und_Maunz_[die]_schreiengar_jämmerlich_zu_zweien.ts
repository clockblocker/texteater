import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "die",

	surface: {
		language: "de",
		normalizedFullSurface: "die",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			number: "Plur",
		},
		lemma: {
			language: "de",
			canonicalLemma: "der",
			lemmaKind: "Lexeme",
			lemmaSubKind: "PRON",
			inherentFeatures: {
				pronType: "Rel",
			},
			meaningInEmojis: "🔗",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Und Minz und Maunz, [die] schreien
gar jämmerlich zu zweien`,
	classifierNotes:
		"Die links the relative clause back to Minz und Maunz, so this is the nominative plural relative pronoun, not the article.",
	isVerified: true,
} as const satisfies AttestedSelection;
