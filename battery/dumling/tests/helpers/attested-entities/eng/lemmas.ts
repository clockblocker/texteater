import type { Lemma } from "../../../../src/types";

// Attestation: "They [walk] home together."
export const englishWalkLemma = {
	canonicalLemma: "walk",
	inherentFeatures: {
		style: null,
		phrasal: null,
		hasGovPrep: null,
		extPos: null,
		abbr: null,
	},
	language: "en",
	lemmaKind: "Lexeme",
	lemmaSubKind: "VERB",
	meaningInEmojis: "🚶",
} satisfies Lemma<"en", "Lexeme", "VERB">;

// Attestation: "Mark gvae [up] on it."
export const englishGiveUpLemma = {
	canonicalLemma: "give up",
	inherentFeatures: {
		hasGovPrep: "up",
		phrasal: "Yes",

		style: null,
		extPos: null,
		abbr: null,
	},
	language: "en",
	lemmaKind: "Lexeme",
	lemmaSubKind: "VERB",
	meaningInEmojis: "🏳️",
} satisfies Lemma<"en", "Lexeme", "VERB">;
