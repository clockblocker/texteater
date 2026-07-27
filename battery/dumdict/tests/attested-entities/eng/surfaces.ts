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
export const englishWalkResolvedInflectionSurface = {
	inflectionalFeatures: {
		tense: "Pres",
		verbForm: "Fin",
	},
	language: "en",
	normalizedFullSurface: "walk",
	surfaceKind: "Inflection",
	lemma: englishWalkLemma,
} satisfies Surface<"en", "Inflection", "Lexeme", "VERB">;

// Attestation: "They [walk] home together."
export const englishWalkUnresolvedInflectionSurface = {
	inflectionalFeatures: {
		tense: "Pres",
		verbForm: "Fin",
	},
	language: "en",
	normalizedFullSurface: "walk",
	surfaceKind: "Inflection",
	lemma: englishWalkLemma,
} satisfies Surface<"en", "Inflection", "Lexeme", "VERB">;

// Attestation: "They [walk] home together."
export const englishWalkResolvedLemmaSurface = {
	language: "en",
	normalizedFullSurface: "walk",
	surfaceKind: "Lemma",
	lemma: englishWalkLemma,
} satisfies Surface<"en", "Lemma", "Lexeme", "VERB">;

// Attestation: "They [walk] home together."
export const englishWalkUnresolvedLemmaSurface = {
	language: "en",
	normalizedFullSurface: "walk",
	surfaceKind: "Lemma",
	lemma: englishWalkLemma,
} satisfies Surface<"en", "Lemma", "Lexeme", "VERB">;

// Attestation: "Mark gvae [up] on it."
export const englishGiveUpTypoUnresolvedInflectionSurface = {
	inflectionalFeatures: {
		tense: "Past",
		verbForm: "Fin",
	},
	language: "en",
	normalizedFullSurface: "gave up",
	surfaceKind: "Inflection",
	lemma: englishGiveUpLemma,
} satisfies Surface<"en", "Inflection", "Lexeme", "VERB">;

// Attestation: "She opened a [bank] account."
export const englishBankFinancialResolvedLemmaSurface = {
	language: "en",
	normalizedFullSurface: "bank",
	surfaceKind: "Lemma",
	lemma: englishBankFinancialLemma,
} satisfies Surface<"en", "Lemma", "Lexeme", "NOUN">;

// Attestation: "The canoe scraped the river [bank]."
export const englishBankRiverResolvedLemmaSurface = {
	language: "en",
	normalizedFullSurface: "bank",
	surfaceKind: "Lemma",
	lemma: englishBankRiverLemma,
} satisfies Surface<"en", "Lemma", "Lexeme", "NOUN">;

// Attestation: "The [plant] needs more light."
export const englishPlantOrganismResolvedLemmaSurface = {
	language: "en",
	normalizedFullSurface: "plant",
	surfaceKind: "Lemma",
	lemma: englishPlantOrganismLemma,
} satisfies Surface<"en", "Lemma", "Lexeme", "NOUN">;

// Attestation: "The auto [plant] added a night shift."
export const englishPlantFactoryResolvedLemmaSurface = {
	language: "en",
	normalizedFullSurface: "plant",
	surfaceKind: "Lemma",
	lemma: englishPlantFactoryLemma,
} satisfies Surface<"en", "Lemma", "Lexeme", "NOUN">;

// Attestation: "The morning [light] filled the room."
export const englishLightIlluminationResolvedLemmaSurface = {
	language: "en",
	normalizedFullSurface: "light",
	surfaceKind: "Lemma",
	lemma: englishLightIlluminationLemma,
} satisfies Surface<"en", "Lemma", "Lexeme", "NOUN">;

// Attestation: "Pack a [light] jacket."
export const englishLightWeightResolvedLemmaSurface = {
	language: "en",
	normalizedFullSurface: "light",
	surfaceKind: "Lemma",
	lemma: englishLightWeightLemma,
} satisfies Surface<"en", "Lemma", "Lexeme", "ADJ">;

// Attestation: "Birds returned in [spring]."
export const englishSpringSeasonResolvedLemmaSurface = {
	language: "en",
	normalizedFullSurface: "spring",
	surfaceKind: "Lemma",
	lemma: englishSpringSeasonLemma,
} satisfies Surface<"en", "Lemma", "Lexeme", "NOUN">;

// Attestation: "The [spring] snapped inside the latch."
export const englishSpringCoilResolvedLemmaSurface = {
	language: "en",
	normalizedFullSurface: "spring",
	surfaceKind: "Lemma",
	lemma: englishSpringCoilLemma,
} satisfies Surface<"en", "Lemma", "Lexeme", "NOUN">;

// Attestation: "Use the [rake] after mowing."
export const englishRakeToolResolvedLemmaSurface = {
	language: "en",
	normalizedFullSurface: "rake",
	surfaceKind: "Lemma",
	lemma: englishRakeToolLemma,
} satisfies Surface<"en", "Lemma", "Lexeme", "NOUN">;

// Attestation: "They [look up] every unknown word."
export const englishLookUpResolvedLemmaSurface = {
	language: "en",
	normalizedFullSurface: "look up",
	surfaceKind: "Lemma",
	lemma: englishLookUpLemma,
} satisfies Surface<"en", "Lemma", "Lexeme", "VERB">;

// Attestation: "Please [look] at the map."
export const englishLookResolvedLemmaSurface = {
	language: "en",
	normalizedFullSurface: "look",
	surfaceKind: "Lemma",
	lemma: englishLookLemma,
} satisfies Surface<"en", "Lemma", "Lexeme", "VERB">;
