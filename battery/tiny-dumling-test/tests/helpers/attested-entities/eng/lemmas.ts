import type { Lemma } from "../../../../src/types";

// Attestation: "They [walk] home together."
export const englishWalkLemma = {
	canonicalForm: "walk",
	coreFeatures: {
		style: null,
		phrasal: null,
		hasGovPrep: null,
		extPos: null,
		abbr: null,
	},
	language: "en",
	family: "Lexeme",
	kind: "VERB",
} satisfies Lemma<"en", "Lexeme", "VERB">;

// Attestation: "Mark gvae [up] on it."
export const englishGiveUpLemma = {
	canonicalForm: "give up",
	coreFeatures: {
		hasGovPrep: null,
		phrasal: "Yes",

		style: null,
		extPos: null,
		abbr: null,
	},
	language: "en",
	family: "Lexeme",
	kind: "VERB",
} satisfies Lemma<"en", "Lexeme", "VERB">;
