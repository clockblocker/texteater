import type * as Dumling from "dumling/types";

export const runLemma = {
	unitKind: "Lemma",
	language: "en",
	canonicalForm: "run",
	family: "Lexeme",
	kind: "VERB",
	coreFeatures: {
		abbr: null,
		extPos: null,
		phrasal: null,
		style: null,
	},
} satisfies Dumling.Lemma<"en", "Lexeme", "VERB">;

export const attestation = {
	lemma: runLemma,
	order: 37,
} as const;
