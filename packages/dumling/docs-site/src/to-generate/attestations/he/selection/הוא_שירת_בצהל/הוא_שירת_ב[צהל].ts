import type { AttestedSelection, Selection } from "dumling/types";

const tzahalAbbrevSelection = {
	language: "he",
	spelledSelection: 'צה"ל',

	surface: {
		language: "he",
		normalizedFullSurface: 'צה"ל',
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalLemma: 'צה"ל',
			lemmaKind: "Lexeme",
			lemmaSubKind: "PROPN",
			inherentFeatures: {
				abbr: "Yes",
				gender: "Masc",
			},
			meaningInEmojis: "🪖",
		},
	},
} satisfies Selection<"he", "Citation", "Lexeme", "PROPN">;

export const attestation = {
	selection: tzahalAbbrevSelection,
	sentenceMarkdown: 'הוא שירת ב[צה"ל].',
	classifierNotes:
		'צה"ל is an abbreviated proper noun with the quote mark retained and abbr Yes.',
} as const satisfies AttestedSelection;
