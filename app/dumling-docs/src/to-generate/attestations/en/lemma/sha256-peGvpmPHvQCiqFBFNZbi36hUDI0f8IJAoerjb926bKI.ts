import type * as Dumling from "dumling/types";

export const bookLemma = {
	unitKind: "Lemma",
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
} satisfies Dumling.Lemma<"en", "Lexeme", "NOUN">;

export const attestation = {
	lemma: bookLemma,
	order: 38,
} as const;
