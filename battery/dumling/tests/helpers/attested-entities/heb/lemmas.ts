import type { Lemma } from "../../../../src/types";

// Attestation: "הוא [כתב] מכתב."
export const hebrewKatavLemma = {
	canonicalLemma: "כתב",
	inherentFeatures: {
		hebBinyan: "PAAL",
	},
	language: "he",
	lemmaKind: "Lexeme",
	lemmaSubKind: "VERB",
	meaningInEmojis: "✍️",
} satisfies Lemma<"he", "Lexeme", "VERB">;

// Attestation: "עוד [שנה] עברה."
export const hebrewShanaLemma = {
	canonicalLemma: "שנה",
	inherentFeatures: {
		gender: ["Fem", "Masc"],
	},
	language: "he",
	lemmaKind: "Lexeme",
	lemmaSubKind: "NOUN",
	meaningInEmojis: "📅",
} satisfies Lemma<"he", "Lexeme", "NOUN">;

// Attestation: "[ארה״ב] הודיעה על צעד חדש."
export const hebrewUsAbbreviationLemma = {
	canonicalLemma: "ארה״ב",
	inherentFeatures: {
		abbr: "Yes",
	},
	language: "he",
	lemmaKind: "Lexeme",
	lemmaSubKind: "PROPN",
	meaningInEmojis: "🇺🇸",
} satisfies Lemma<"he", "Lexeme", "PROPN">;
