import type * as Dumling from "dumling/types";

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
	unitKind: "Attestation" as const,
	members: [{ attested: "walk", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: englishWalkAttestedInflectionSurface,
} satisfies Dumling.Attestation<"en", "Lexeme", "VERB">;

// Attestation: "They [walk] home together."
export const englishWalkCitationAttestation = {
	unitKind: "Attestation" as const,
	members: [{ attested: "walk", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: englishWalkCitationSurface,
} satisfies Dumling.Attestation<"en", "Lexeme", "VERB">;

// Attestation: "Mark [gvae] [up] on it."
export const englishGiveUpTypoFullAttestation = {
	unitKind: "Attestation" as const,
	members: [
		{ attested: "gvae", orthography: "Typo" },
		{ attested: "up", orthography: "Standard" },
	],
	realizationCoverage: "Full",
	surface: englishGiveUpPastFiniteInflectionSurface,
} satisfies Dumling.Attestation<"en", "Lexeme", "VERB">;

// Attestation: "She opened a [bank] account."
export const englishBankFinancialAttestation = {
	unitKind: "Attestation" as const,
	members: [{ attested: "bank", orthography: "Standard" }],
	realizationCoverage: "Full",
	articleEvidence: null,
	surface: englishBankFinancialCitationSurface,
} satisfies Dumling.Attestation<"en", "Lexeme", "NOUN">;

// Attestation: "The canoe scraped the river [bank]."
export const englishBankRiverAttestation = {
	unitKind: "Attestation" as const,
	members: [{ attested: "bank", orthography: "Standard" }],
	realizationCoverage: "Full",
	articleEvidence: null,
	surface: englishBankRiverCitationSurface,
} satisfies Dumling.Attestation<"en", "Lexeme", "NOUN">;

// Attestation: "The [plant] needs more light."
export const englishPlantOrganismAttestation = {
	unitKind: "Attestation" as const,
	members: [{ attested: "plant", orthography: "Standard" }],
	realizationCoverage: "Full",
	articleEvidence: null,
	surface: englishPlantOrganismCitationSurface,
} satisfies Dumling.Attestation<"en", "Lexeme", "NOUN">;

// Attestation: "The auto [plant] added a night shift."
export const englishPlantFactoryAttestation = {
	unitKind: "Attestation" as const,
	members: [{ attested: "plant", orthography: "Standard" }],
	realizationCoverage: "Full",
	articleEvidence: null,
	surface: englishPlantFactoryCitationSurface,
} satisfies Dumling.Attestation<"en", "Lexeme", "NOUN">;

// Attestation: "The morning [light] filled the room."
export const englishLightIlluminationAttestation = {
	unitKind: "Attestation" as const,
	members: [{ attested: "light", orthography: "Standard" }],
	realizationCoverage: "Full",
	articleEvidence: null,
	surface: englishLightIlluminationCitationSurface,
} satisfies Dumling.Attestation<"en", "Lexeme", "NOUN">;

// Attestation: "Pack a [light] jacket."
export const englishLightWeightAttestation = {
	unitKind: "Attestation" as const,
	members: [{ attested: "light", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: englishLightWeightCitationSurface,
} satisfies Dumling.Attestation<"en", "Lexeme", "ADJ">;

// Attestation: "Birds returned in [spring]."
export const englishSpringSeasonAttestation = {
	unitKind: "Attestation" as const,
	members: [{ attested: "spring", orthography: "Standard" }],
	realizationCoverage: "Full",
	articleEvidence: null,
	surface: englishSpringSeasonCitationSurface,
} satisfies Dumling.Attestation<"en", "Lexeme", "NOUN">;

// Attestation: "The [spring] snapped inside the latch."
export const englishSpringCoilAttestation = {
	unitKind: "Attestation" as const,
	members: [{ attested: "spring", orthography: "Standard" }],
	realizationCoverage: "Full",
	articleEvidence: null,
	surface: englishSpringCoilCitationSurface,
} satisfies Dumling.Attestation<"en", "Lexeme", "NOUN">;

// Attestation: "Use the [rake] after mowing."
export const englishRakeToolAttestation = {
	unitKind: "Attestation" as const,
	members: [{ attested: "rake", orthography: "Standard" }],
	realizationCoverage: "Full",
	articleEvidence: null,
	surface: englishRakeToolCitationSurface,
} satisfies Dumling.Attestation<"en", "Lexeme", "NOUN">;

// Attestation: "They [look] [up] every unknown word."
export const englishLookUpAttestation = {
	unitKind: "Attestation" as const,
	members: [
		{ attested: "look", orthography: "Standard" },
		{ attested: "up", orthography: "Standard" },
	],
	realizationCoverage: "Full",
	surface: englishLookUpCitationSurface,
} satisfies Dumling.Attestation<"en", "Lexeme", "VERB">;

// Attestation: "Please [look] at the map."
export const englishLookAttestation = {
	unitKind: "Attestation" as const,
	members: [{ attested: "look", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: englishLookCitationSurface,
} satisfies Dumling.Attestation<"en", "Lexeme", "VERB">;

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
] as const satisfies readonly Dumling.Attestation<"en">[];
