import type { Surface } from "../../../../src/types";
import { englishGiveUpLemma, englishWalkLemma } from "./lemmas";

// Attestation: "They [walk] home together."
export const englishWalkCitationSurface = {
	language: "en",
	normalizedSurface: "walk",
	spelling: "Canonical",
	surfaceKind: "Citation",
	lemma: englishWalkLemma,

	surfaceFeatures: null,
} satisfies Surface<"en", "Citation", "Lexeme", "VERB">;

// Attestation: "They [walk] home together."
export const englishWalkInflectionSurface = {
	inflectionalFeatures: {
		tense: "Pres",
		verbForm: "Fin",

		voice: null,
		person: null,
		number: null,
		mood: null,
	},
	language: "en",
	normalizedSurface: "walk",
	spelling: "Canonical",
	surfaceKind: "Inflection",
	lemma: englishWalkLemma,

	surfaceFeatures: null,
} satisfies Surface<"en", "Inflection", "Lexeme", "VERB">;

// Attestation: "Mark gvae [up] on it."
export const englishGiveUpInflectionSurface = {
	inflectionalFeatures: {
		tense: "Past",
		verbForm: "Fin",

		voice: null,
		person: null,
		number: null,
		mood: null,
	},
	language: "en",
	normalizedSurface: "gave up",
	spelling: "Canonical",
	surfaceKind: "Inflection",
	lemma: englishGiveUpLemma,

	surfaceFeatures: null,
} satisfies Surface<"en", "Inflection", "Lexeme", "VERB">;
