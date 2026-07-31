import type { Lemma } from "dumling/types";

export const runLemma = {
	language: "en",
	canonicalForm: "run",
	family: "Lexeme",
	kind: "VERB",
	coreFeatures: {
		abbr: null,
		extPos: null,
		hasGovPrep: null,
		phrasal: null,
		style: null,
	},
} satisfies Lemma<"en", "Lexeme", "VERB">;

export const attestation = {
	lemma: runLemma,
	order: 37,
} as const;
