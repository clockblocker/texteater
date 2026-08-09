import type { Attestation } from "dumling/types";
import {
	englishBankFinancialCitationSurface,
	englishBankRiverCitationSurface,
	englishGiveUpPastFiniteInflectionSurface,
	englishLightIlluminationCitationSurface,
	englishLightWeightCitationSurface,
	englishLookCitationSurface,
	englishLookUpCitationSurface,
	englishPlantFactoryCitationSurface,
	englishPlantOrganismCitationSurface,
	englishRakeToolCitationSurface,
	englishSpringCoilCitationSurface,
	englishSpringSeasonCitationSurface,
	englishWalkAttestedInflectionSurface,
	englishWalkCitationSurface,
} from "./surfaces";

// Attestation: "They [walk] home together."
export const englishWalkStandardFullAttestation = {
	members: [{ attested: "walk", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: englishWalkAttestedInflectionSurface,
} satisfies Attestation<"en", "Inflection", "Lexeme", "VERB">;

// Attestation: "They [walk] home together."
export const englishWalkCitationAttestation = {
	members: [{ attested: "walk", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: englishWalkCitationSurface,
} satisfies Attestation<"en", "Citation", "Lexeme", "VERB">;

// Attestation: "Mark [gvae] [up] on it."
export const englishGiveUpTypoFullAttestation = {
	members: [
		{ attested: "gvae", orthography: "Typo" },
		{ attested: "up", orthography: "Standard" },
	],
	realizationCoverage: "Full",
	surface: englishGiveUpPastFiniteInflectionSurface,
} satisfies Attestation<"en", "Inflection", "Lexeme", "VERB">;

// Attestation: "She opened a [bank] account."
export const englishBankFinancialAttestation = {
	members: [{ attested: "bank", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: englishBankFinancialCitationSurface,
} satisfies Attestation<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "The canoe scraped the river [bank]."
export const englishBankRiverAttestation = {
	members: [{ attested: "bank", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: englishBankRiverCitationSurface,
} satisfies Attestation<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "The [plant] needs more light."
export const englishPlantOrganismAttestation = {
	members: [{ attested: "plant", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: englishPlantOrganismCitationSurface,
} satisfies Attestation<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "The auto [plant] added a night shift."
export const englishPlantFactoryAttestation = {
	members: [{ attested: "plant", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: englishPlantFactoryCitationSurface,
} satisfies Attestation<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "The morning [light] filled the room."
export const englishLightIlluminationAttestation = {
	members: [{ attested: "light", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: englishLightIlluminationCitationSurface,
} satisfies Attestation<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "Pack a [light] jacket."
export const englishLightWeightAttestation = {
	members: [{ attested: "light", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: englishLightWeightCitationSurface,
} satisfies Attestation<"en", "Citation", "Lexeme", "ADJ">;

// Attestation: "Birds returned in [spring]."
export const englishSpringSeasonAttestation = {
	members: [{ attested: "spring", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: englishSpringSeasonCitationSurface,
} satisfies Attestation<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "The [spring] snapped inside the latch."
export const englishSpringCoilAttestation = {
	members: [{ attested: "spring", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: englishSpringCoilCitationSurface,
} satisfies Attestation<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "Use the [rake] after mowing."
export const englishRakeToolAttestation = {
	members: [{ attested: "rake", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: englishRakeToolCitationSurface,
} satisfies Attestation<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "They [look] [up] every unknown word."
export const englishLookUpAttestation = {
	members: [
		{ attested: "look", orthography: "Standard" },
		{ attested: "up", orthography: "Standard" },
	],
	realizationCoverage: "Full",
	surface: englishLookUpCitationSurface,
} satisfies Attestation<"en", "Citation", "Lexeme", "VERB">;

// Attestation: "Please [look] at the map."
export const englishLookAttestation = {
	members: [{ attested: "look", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: englishLookCitationSurface,
} satisfies Attestation<"en", "Citation", "Lexeme", "VERB">;

export const englishAttestations = [
	englishWalkStandardFullAttestation,
	englishWalkCitationAttestation,
	englishGiveUpTypoFullAttestation,
	englishBankFinancialAttestation,
	englishBankRiverAttestation,
	englishPlantOrganismAttestation,
	englishPlantFactoryAttestation,
	englishLightIlluminationAttestation,
	englishLightWeightAttestation,
	englishSpringSeasonAttestation,
	englishSpringCoilAttestation,
	englishRakeToolAttestation,
	englishLookUpAttestation,
	englishLookAttestation,
] as const satisfies readonly Attestation<"en">[];
