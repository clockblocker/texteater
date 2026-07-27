import type { Selection } from "../../../src";
import {
	englishBankFinancialResolvedLemmaSurface,
	englishBankRiverResolvedLemmaSurface,
	englishGiveUpTypoUnresolvedInflectionSurface,
	englishLightIlluminationResolvedLemmaSurface,
	englishLightWeightResolvedLemmaSurface,
	englishLookResolvedLemmaSurface,
	englishLookUpResolvedLemmaSurface,
	englishPlantFactoryResolvedLemmaSurface,
	englishPlantOrganismResolvedLemmaSurface,
	englishRakeToolResolvedLemmaSurface,
	englishSpringCoilResolvedLemmaSurface,
	englishSpringSeasonResolvedLemmaSurface,
	englishWalkResolvedLemmaSurface,
	englishWalkUnresolvedInflectionSurface,
} from "./surfaces";

// Attestation: "They [walk] home together."
export const englishWalkStandardFullSelection = {
	language: "en",
	orthographicStatus: "Standard",
	selectionCoverage: "Full",
	spelledSelection: "walk",
	spellingRelation: "Canonical",
	surface: englishWalkUnresolvedInflectionSurface,
} satisfies Selection<"en", "Standard", "Inflection", "Lexeme", "VERB">;

// Attestation: "They [walk] home together."
export const englishWalkResolvedLemmaSelection = {
	language: "en",
	orthographicStatus: "Standard",
	selectionCoverage: "Full",
	spelledSelection: "walk",
	spellingRelation: "Canonical",
	surface: englishWalkResolvedLemmaSurface,
} satisfies Selection<"en", "Standard", "Lemma", "Lexeme", "VERB">;

// Attestation: "Mark gvae [up] on it."
export const englishGiveUpTypoPartialUpSelection = {
	language: "en",
	orthographicStatus: "Typo",
	selectionCoverage: "Partial",
	spelledSelection: "up",
	spellingRelation: "Canonical",
	surface: englishGiveUpTypoUnresolvedInflectionSurface,
} satisfies Selection<"en", "Typo", "Inflection", "Lexeme", "VERB">;

// Attestation: "Mark [gvae] up on it."
export const englishGiveUpTypoPartialGvaeSelection = {
	language: "en",
	orthographicStatus: "Typo",
	selectionCoverage: "Partial",
	spelledSelection: "gvae",
	spellingRelation: "Variant",
	surface: englishGiveUpTypoUnresolvedInflectionSurface,
} satisfies Selection<"en", "Typo", "Inflection", "Lexeme", "VERB">;

// Attestation: "She opened a [bank] account."
export const englishBankFinancialSelection = {
	language: "en",
	orthographicStatus: "Standard",
	selectionCoverage: "Full",
	spelledSelection: "bank",
	spellingRelation: "Canonical",
	surface: englishBankFinancialResolvedLemmaSurface,
} satisfies Selection<"en", "Standard", "Lemma", "Lexeme", "NOUN">;

// Attestation: "The canoe scraped the river [bank]."
export const englishBankRiverSelection = {
	language: "en",
	orthographicStatus: "Standard",
	selectionCoverage: "Full",
	spelledSelection: "bank",
	spellingRelation: "Canonical",
	surface: englishBankRiverResolvedLemmaSurface,
} satisfies Selection<"en", "Standard", "Lemma", "Lexeme", "NOUN">;

// Attestation: "The [plant] needs more light."
export const englishPlantOrganismSelection = {
	language: "en",
	orthographicStatus: "Standard",
	selectionCoverage: "Full",
	spelledSelection: "plant",
	spellingRelation: "Canonical",
	surface: englishPlantOrganismResolvedLemmaSurface,
} satisfies Selection<"en", "Standard", "Lemma", "Lexeme", "NOUN">;

// Attestation: "The auto [plant] added a night shift."
export const englishPlantFactorySelection = {
	language: "en",
	orthographicStatus: "Standard",
	selectionCoverage: "Full",
	spelledSelection: "plant",
	spellingRelation: "Canonical",
	surface: englishPlantFactoryResolvedLemmaSurface,
} satisfies Selection<"en", "Standard", "Lemma", "Lexeme", "NOUN">;

// Attestation: "The morning [light] filled the room."
export const englishLightIlluminationSelection = {
	language: "en",
	orthographicStatus: "Standard",
	selectionCoverage: "Full",
	spelledSelection: "light",
	spellingRelation: "Canonical",
	surface: englishLightIlluminationResolvedLemmaSurface,
} satisfies Selection<"en", "Standard", "Lemma", "Lexeme", "NOUN">;

// Attestation: "Pack a [light] jacket."
export const englishLightWeightSelection = {
	language: "en",
	orthographicStatus: "Standard",
	selectionCoverage: "Full",
	spelledSelection: "light",
	spellingRelation: "Canonical",
	surface: englishLightWeightResolvedLemmaSurface,
} satisfies Selection<"en", "Standard", "Lemma", "Lexeme", "ADJ">;

// Attestation: "Birds returned in [spring]."
export const englishSpringSeasonSelection = {
	language: "en",
	orthographicStatus: "Standard",
	selectionCoverage: "Full",
	spelledSelection: "spring",
	spellingRelation: "Canonical",
	surface: englishSpringSeasonResolvedLemmaSurface,
} satisfies Selection<"en", "Standard", "Lemma", "Lexeme", "NOUN">;

// Attestation: "The [spring] snapped inside the latch."
export const englishSpringCoilSelection = {
	language: "en",
	orthographicStatus: "Standard",
	selectionCoverage: "Full",
	spelledSelection: "spring",
	spellingRelation: "Canonical",
	surface: englishSpringCoilResolvedLemmaSurface,
} satisfies Selection<"en", "Standard", "Lemma", "Lexeme", "NOUN">;

// Attestation: "Use the [rake] after mowing."
export const englishRakeToolSelection = {
	language: "en",
	orthographicStatus: "Standard",
	selectionCoverage: "Full",
	spelledSelection: "rake",
	spellingRelation: "Canonical",
	surface: englishRakeToolResolvedLemmaSurface,
} satisfies Selection<"en", "Standard", "Lemma", "Lexeme", "NOUN">;

// Attestation: "They [look up] every unknown word."
export const englishLookUpSelection = {
	language: "en",
	orthographicStatus: "Standard",
	selectionCoverage: "Full",
	spelledSelection: "look up",
	spellingRelation: "Canonical",
	surface: englishLookUpResolvedLemmaSurface,
} satisfies Selection<"en", "Standard", "Lemma", "Lexeme", "VERB">;

// Attestation: "Please [look] at the map."
export const englishLookSelection = {
	language: "en",
	orthographicStatus: "Standard",
	selectionCoverage: "Full",
	spelledSelection: "look",
	spellingRelation: "Canonical",
	surface: englishLookResolvedLemmaSurface,
} satisfies Selection<"en", "Standard", "Lemma", "Lexeme", "VERB">;
