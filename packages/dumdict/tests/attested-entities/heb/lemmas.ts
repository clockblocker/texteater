import type { Lemma } from "../../../src";

// Attestation: "הוא [כתב] מכתב."
export const hebrewKatavLemma = {
	canonicalLemma: "כתב",
	inherentFeatures: {
		hebBinyan: "PAAL",
	},
	language: "he",
	lemmaKind: "Lexeme",
	meaningInEmojis: "✍️",
	lemmaSubKind: "VERB",
} satisfies Lemma<"he", "Lexeme", "VERB">;

// Attestation: "עוד [שנה] עברה."
export const hebrewShanaLemma = {
	canonicalLemma: "שנה",
	inherentFeatures: {
		gender: "Fem",
	},
	language: "he",
	lemmaKind: "Lexeme",
	meaningInEmojis: "📅",
	lemmaSubKind: "NOUN",
} satisfies Lemma<"he", "Lexeme", "NOUN">;

// Attestation: "[ארה״ב] הודיעה על צעד חדש."
// UD-style: multi-word abbreviations keep the abbreviated form as canonicalLemma and mark Abbr=Yes.
// See https://universaldependencies.org/u/overview/morphology.html
export const hebrewUsAbbreviationLemma = {
	canonicalLemma: "ארה״ב",
	inherentFeatures: {
		abbr: "Yes",
	},
	language: "he",
	lemmaKind: "Lexeme",
	meaningInEmojis: "🇺🇸",
	lemmaSubKind: "PROPN",
} satisfies Lemma<"he", "Lexeme", "PROPN">;
