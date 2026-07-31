import { dumling, type Selection } from "../../../src";
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
export const englishWalkStandardFullSelection = {
	segmentedSentenceId: dumling.en.create.segmentedSentenceId(
		"test:englishWalkStandardFullSelection",
	),
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	selectedOrthography: "Standard",
	attestedSurface: "walk",
	surface: englishWalkAttestedInflectionSurface,
} satisfies Selection<"en", "Inflection", "Lexeme", "VERB">;

// Attestation: "They [walk] home together."
export const englishWalkCitationSelection = {
	segmentedSentenceId: dumling.en.create.segmentedSentenceId(
		"test:englishWalkCitationSelection",
	),
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	selectedOrthography: "Standard",
	attestedSurface: "walk",
	surface: englishWalkCitationSurface,
} satisfies Selection<"en", "Citation", "Lexeme", "VERB">;

// Attestation: "Mark gvae [up] on it."
export const englishGiveUpClickedUpSelection = {
	segmentedSentenceId: dumling.en.create.segmentedSentenceId(
		"test:mark-gvae-up-on-it",
	),
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [2, 4],
	selectedOrthography: "Standard",
	attestedSurface: "gvae up",
	surface: englishGiveUpPastFiniteInflectionSurface,
} satisfies Selection<"en", "Inflection", "Lexeme", "VERB">;

// Attestation: "Mark [gvae] up on it."
export const englishGiveUpClickedGvaeSelection = {
	segmentedSentenceId: dumling.en.create.segmentedSentenceId(
		"test:mark-gvae-up-on-it",
	),
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2, 4],
	selectedOrthography: "Typo",
	attestedSurface: "gvae up",
	surface: englishGiveUpPastFiniteInflectionSurface,
} satisfies Selection<"en", "Inflection", "Lexeme", "VERB">;

// Attestation: "She opened a [bank] account."
export const englishBankFinancialSelection = {
	segmentedSentenceId: dumling.en.create.segmentedSentenceId(
		"test:englishBankFinancialSelection",
	),
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [6],
	selectedOrthography: "Standard",
	attestedSurface: "bank",
	surface: englishBankFinancialCitationSurface,
} satisfies Selection<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "The canoe scraped the river [bank]."
export const englishBankRiverSelection = {
	segmentedSentenceId: dumling.en.create.segmentedSentenceId(
		"test:englishBankRiverSelection",
	),
	clickedSegmentIndex: 10,
	surfaceSegmentIndices: [10],
	selectedOrthography: "Standard",
	attestedSurface: "bank",
	surface: englishBankRiverCitationSurface,
} satisfies Selection<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "The [plant] needs more light."
export const englishPlantOrganismSelection = {
	segmentedSentenceId: dumling.en.create.segmentedSentenceId(
		"test:englishPlantOrganismSelection",
	),
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	selectedOrthography: "Standard",
	attestedSurface: "plant",
	surface: englishPlantOrganismCitationSurface,
} satisfies Selection<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "The auto [plant] added a night shift."
export const englishPlantFactorySelection = {
	segmentedSentenceId: dumling.en.create.segmentedSentenceId(
		"test:englishPlantFactorySelection",
	),
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	selectedOrthography: "Standard",
	attestedSurface: "plant",
	surface: englishPlantFactoryCitationSurface,
} satisfies Selection<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "The morning [light] filled the room."
export const englishLightIlluminationSelection = {
	segmentedSentenceId: dumling.en.create.segmentedSentenceId(
		"test:englishLightIlluminationSelection",
	),
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	selectedOrthography: "Standard",
	attestedSurface: "light",
	surface: englishLightIlluminationCitationSurface,
} satisfies Selection<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "Pack a [light] jacket."
export const englishLightWeightSelection = {
	segmentedSentenceId: dumling.en.create.segmentedSentenceId(
		"test:englishLightWeightSelection",
	),
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	selectedOrthography: "Standard",
	attestedSurface: "light",
	surface: englishLightWeightCitationSurface,
} satisfies Selection<"en", "Citation", "Lexeme", "ADJ">;

// Attestation: "Birds returned in [spring]."
export const englishSpringSeasonSelection = {
	segmentedSentenceId: dumling.en.create.segmentedSentenceId(
		"test:englishSpringSeasonSelection",
	),
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [6],
	selectedOrthography: "Standard",
	attestedSurface: "spring",
	surface: englishSpringSeasonCitationSurface,
} satisfies Selection<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "The [spring] snapped inside the latch."
export const englishSpringCoilSelection = {
	segmentedSentenceId: dumling.en.create.segmentedSentenceId(
		"test:englishSpringCoilSelection",
	),
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	selectedOrthography: "Standard",
	attestedSurface: "spring",
	surface: englishSpringCoilCitationSurface,
} satisfies Selection<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "Use the [rake] after mowing."
export const englishRakeToolSelection = {
	segmentedSentenceId: dumling.en.create.segmentedSentenceId(
		"test:englishRakeToolSelection",
	),
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	selectedOrthography: "Standard",
	attestedSurface: "rake",
	surface: englishRakeToolCitationSurface,
} satisfies Selection<"en", "Citation", "Lexeme", "NOUN">;

// Attestation: "They [look up] every unknown word."
export const englishLookUpSelection = {
	segmentedSentenceId: dumling.en.create.segmentedSentenceId(
		"test:englishLookUpSelection",
	),
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2, 4],
	selectedOrthography: "Standard",
	attestedSurface: "look up",
	surface: englishLookUpCitationSurface,
} satisfies Selection<"en", "Citation", "Lexeme", "VERB">;

// Attestation: "Please [look] at the map."
export const englishLookSelection = {
	segmentedSentenceId: dumling.en.create.segmentedSentenceId(
		"test:englishLookSelection",
	),
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	selectedOrthography: "Standard",
	attestedSurface: "look",
	surface: englishLookCitationSurface,
} satisfies Selection<"en", "Citation", "Lexeme", "VERB">;
