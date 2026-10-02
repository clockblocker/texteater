import type * as Dumling from "dumling/types";

const lemma: Dumling.Lemma<"en", "Lexeme", "VERB"> = {
	unitKind: "Lemma",
	language: "en",
	canonicalForm: "walk",
	family: "Lexeme",
	kind: "VERB",
	coreFeatures: {
		abbr: null,
		extPos: null,
		phrasal: null,
	},
};
const surface: Dumling.Surface<"en", "Lexeme", "VERB"> = {
	unitKind: "Surface",
	language: "en",
	lemma,
	normalizedSurface: "walk",
	spelling: { kind: "Canonical" },
	surfaceFeatures: null,
	inflectionalFeatures: {
		mood: null,
		number: null,
		person: null,
		tense: null,
		verbForm: "Inf",
		voice: null,
	},
};
export const attestation: Dumling.Attestation<"en", "Lexeme", "VERB"> = {
	unitKind: "Attestation",
	surface,
	members: [{ attested: "walk", orthography: "Standard" }],
	realizationCoverage: "Full",
};
