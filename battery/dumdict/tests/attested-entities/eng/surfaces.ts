import type * as Dumling from "dumling/types";

import {
	englishBankFinancialLemma,
	englishBankRiverLemma,
	englishGiveUpLemma,
	englishLightIlluminationLemma,
	englishLightWeightLemma,
	englishLookLemma,
	englishLookUpLemma,
	englishPlantFactoryLemma,
	englishPlantOrganismLemma,
	englishRakeToolLemma,
	englishSpringCoilLemma,
	englishSpringSeasonLemma,
	englishWalkLemma,
} from "./lemmas";

// Attestation: "They [walk] home together."
export const englishWalkPresentFiniteInflectionSurface = {
	unitKind: "Surface" as const,
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

	lemma: englishWalkLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Dumling.Surface<"en", "Lexeme", "VERB">;

// Attestation: "They [walk] home together."
export const englishWalkAttestedInflectionSurface = {
	unitKind: "Surface" as const,
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

	lemma: englishWalkLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Dumling.Surface<"en", "Lexeme", "VERB">;

// Attestation: "They [walk] home together."
export const englishWalkCitationSurface = {
	unitKind: "Surface" as const,
	inflectionalFeatures: null,
	language: "en",
	normalizedSurface: "walk",

	lemma: englishWalkLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Dumling.Surface<"en", "Lexeme", "VERB">;

// Attestation: "They [walk] home together."
export const englishWalkCanonicalCitationSurface = {
	unitKind: "Surface" as const,
	inflectionalFeatures: null,
	language: "en",
	normalizedSurface: "walk",

	lemma: englishWalkLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Dumling.Surface<"en", "Lexeme", "VERB">;

// Attestation: "Mark gvae [up] on it."
export const englishGiveUpPastFiniteInflectionSurface = {
	unitKind: "Surface" as const,
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

	lemma: englishGiveUpLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Dumling.Surface<"en", "Lexeme", "VERB">;

// Attestation: "She opened a [bank] account."
export const englishBankFinancialCitationSurface = {
	unitKind: "Surface" as const,
	inflectionalFeatures: null,
	language: "en",
	normalizedSurface: "bank",

	lemma: englishBankFinancialLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Dumling.Surface<"en", "Lexeme", "NOUN">;

// Attestation: "The canoe scraped the river [bank]."
export const englishBankRiverCitationSurface = {
	unitKind: "Surface" as const,
	inflectionalFeatures: null,
	language: "en",
	normalizedSurface: "bank",

	lemma: englishBankRiverLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Dumling.Surface<"en", "Lexeme", "NOUN">;

// Attestation: "The [plant] needs more light."
export const englishPlantOrganismCitationSurface = {
	unitKind: "Surface" as const,
	inflectionalFeatures: null,
	language: "en",
	normalizedSurface: "plant",

	lemma: englishPlantOrganismLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Dumling.Surface<"en", "Lexeme", "NOUN">;

// Attestation: "The auto [plant] added a night shift."
export const englishPlantFactoryCitationSurface = {
	unitKind: "Surface" as const,
	inflectionalFeatures: null,
	language: "en",
	normalizedSurface: "plant",

	lemma: englishPlantFactoryLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Dumling.Surface<"en", "Lexeme", "NOUN">;

// Attestation: "The morning [light] filled the room."
export const englishLightIlluminationCitationSurface = {
	unitKind: "Surface" as const,
	inflectionalFeatures: null,
	language: "en",
	normalizedSurface: "light",

	lemma: englishLightIlluminationLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Dumling.Surface<"en", "Lexeme", "NOUN">;

// Attestation: "Pack a [light] jacket."
export const englishLightWeightCitationSurface = {
	unitKind: "Surface" as const,
	inflectionalFeatures: null,
	language: "en",
	normalizedSurface: "light",

	lemma: englishLightWeightLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Dumling.Surface<"en", "Lexeme", "ADJ">;

// Attestation: "Birds returned in [spring]."
export const englishSpringSeasonCitationSurface = {
	unitKind: "Surface" as const,
	inflectionalFeatures: null,
	language: "en",
	normalizedSurface: "spring",

	lemma: englishSpringSeasonLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Dumling.Surface<"en", "Lexeme", "NOUN">;

// Attestation: "The [spring] snapped inside the latch."
export const englishSpringCoilCitationSurface = {
	unitKind: "Surface" as const,
	inflectionalFeatures: null,
	language: "en",
	normalizedSurface: "spring",

	lemma: englishSpringCoilLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Dumling.Surface<"en", "Lexeme", "NOUN">;

// Attestation: "Use the [rake] after mowing."
export const englishRakeToolCitationSurface = {
	unitKind: "Surface" as const,
	inflectionalFeatures: null,
	language: "en",
	normalizedSurface: "rake",

	lemma: englishRakeToolLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Dumling.Surface<"en", "Lexeme", "NOUN">;

// Attestation: "They [look up] every unknown word."
export const englishLookUpCitationSurface = {
	unitKind: "Surface" as const,
	inflectionalFeatures: null,
	language: "en",
	normalizedSurface: "look up",

	lemma: englishLookUpLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Dumling.Surface<"en", "Lexeme", "VERB">;

// Attestation: "Please [look] at the map."
export const englishLookCitationSurface = {
	unitKind: "Surface" as const,
	inflectionalFeatures: null,
	language: "en",
	normalizedSurface: "look",

	lemma: englishLookLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Dumling.Surface<"en", "Lexeme", "VERB">;
