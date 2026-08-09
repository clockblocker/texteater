import type { Surface } from "../../../src";
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
	surfaceKind: "Inflection",
	lemma: englishWalkLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Surface<"en", "Inflection", "Lexeme", "VERB">;

// Attestation: "They [walk] home together."
export const englishWalkAttestedInflectionSurface = {
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
	surfaceKind: "Inflection",
	lemma: englishWalkLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Surface<"en", "Inflection", "Lexeme", "VERB">;

// Attestation: "They [walk] home together."
export const englishWalkCitationSurface = {
	language: "en",
	normalizedSurface: "walk",
	surfaceKind: "Citation",
	lemma: englishWalkLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Surface<"en", "Citation", "Lexeme", "VERB">;

// Attestation: "They [walk] home together."
export const englishWalkCanonicalCitationSurface = {
	language: "en",
	normalizedSurface: "walk",
	surfaceKind: "Citation",
	lemma: englishWalkLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Surface<"en", "Citation", "Lexeme", "VERB">;

// Attestation: "Mark gvae [up] on it."
export const englishGiveUpPastFiniteInflectionSurface = {
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
	surfaceKind: "Inflection",
	lemma: englishGiveUpLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Surface<"en", "Inflection", "Lexeme", "VERB">;

// Attestation: "She opened a [bank] account."
export const englishBankFinancialCitationSurface = {
	language: "en",
	normalizedSurface: "bank",
	surfaceKind: "Citation",
	lemma: englishBankFinancialLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Surface<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "The canoe scraped the river [bank]."
export const englishBankRiverCitationSurface = {
	language: "en",
	normalizedSurface: "bank",
	surfaceKind: "Citation",
	lemma: englishBankRiverLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Surface<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "The [plant] needs more light."
export const englishPlantOrganismCitationSurface = {
	language: "en",
	normalizedSurface: "plant",
	surfaceKind: "Citation",
	lemma: englishPlantOrganismLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Surface<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "The auto [plant] added a night shift."
export const englishPlantFactoryCitationSurface = {
	language: "en",
	normalizedSurface: "plant",
	surfaceKind: "Citation",
	lemma: englishPlantFactoryLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Surface<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "The morning [light] filled the room."
export const englishLightIlluminationCitationSurface = {
	language: "en",
	normalizedSurface: "light",
	surfaceKind: "Citation",
	lemma: englishLightIlluminationLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Surface<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "Pack a [light] jacket."
export const englishLightWeightCitationSurface = {
	language: "en",
	normalizedSurface: "light",
	surfaceKind: "Citation",
	lemma: englishLightWeightLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Surface<"en", "Citation", "Lexeme", "ADJ">;

// Attestation: "Birds returned in [spring]."
export const englishSpringSeasonCitationSurface = {
	language: "en",
	normalizedSurface: "spring",
	surfaceKind: "Citation",
	lemma: englishSpringSeasonLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Surface<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "The [spring] snapped inside the latch."
export const englishSpringCoilCitationSurface = {
	language: "en",
	normalizedSurface: "spring",
	surfaceKind: "Citation",
	lemma: englishSpringCoilLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Surface<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "Use the [rake] after mowing."
export const englishRakeToolCitationSurface = {
	language: "en",
	normalizedSurface: "rake",
	surfaceKind: "Citation",
	lemma: englishRakeToolLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Surface<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "They [look up] every unknown word."
export const englishLookUpCitationSurface = {
	language: "en",
	normalizedSurface: "look up",
	surfaceKind: "Citation",
	lemma: englishLookUpLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Surface<"en", "Citation", "Lexeme", "VERB">;

// Attestation: "Please [look] at the map."
export const englishLookCitationSurface = {
	language: "en",
	normalizedSurface: "look",
	surfaceKind: "Citation",
	lemma: englishLookLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Surface<"en", "Citation", "Lexeme", "VERB">;
