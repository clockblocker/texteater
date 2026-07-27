import type { Lemma } from "../../../../src/types";

// Attestation: "They [walk] home together."
export const englishWalkLemma = {
	canonicalLemma: "walk",
	inherentFeatures: {},
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
	},
	language: "en",
	lemmaKind: "Lexeme",
	lemmaSubKind: "VERB",
	meaningInEmojis: "🏳️",
} satisfies Lemma<"en", "Lexeme", "VERB">;
