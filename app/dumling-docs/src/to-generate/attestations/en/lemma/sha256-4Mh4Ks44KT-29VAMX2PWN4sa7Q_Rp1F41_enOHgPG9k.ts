import type { Lemma } from "dumling/types";

export const bookLemma = {
	language: "en",
	canonicalForm: "book",
	family: "Lexeme",
	kind: "NOUN",
	coreFeatures: {
		abbr: null,
		extPos: null,
		foreign: null,
		numForm: null,
		numType: null,
		style: null,
	},
} satisfies Lemma<"en", "Lexeme", "NOUN">;

export const attestation = {
	lemma: bookLemma,
	order: 38,
} as const;
