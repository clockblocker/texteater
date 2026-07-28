import type { Selection } from "../../../../src/types";
import {
	englishGiveUpInflectionSurface,
	englishWalkCitationSurface,
	englishWalkInflectionSurface,
} from "./surfaces";

// Attestation: "They [walk] home together."
export const englishWalkStandardFullSelection = {
	language: "en",
	spelledSelection: "walk",

	surface: englishWalkInflectionSurface,

	selectionFeatures: null,
} satisfies Selection<"en", "Inflection", "Lexeme", "VERB">;

// Attestation: "They [walk] home together."
export const englishWalkCitationSelection = {
	language: "en",
	spelledSelection: "walk",

	surface: englishWalkCitationSurface,

	selectionFeatures: null,
} satisfies Selection<"en", "Citation", "Lexeme", "VERB">;

// Attestation: "Mark gvae [up] on it."
export const englishGiveUpTypoPartialUpSelection = {
	language: "en",
	selectionFeatures: {
		orthography: "Typo",
		coverage: "Partial",
		spelling: null,
	},
	spelledSelection: "up",

	surface: englishGiveUpInflectionSurface,
} satisfies Selection<"en", "Inflection", "Lexeme", "VERB">;

// Attestation: "Mark [gvae] up on it."
export const englishGiveUpTypoPartialGvaeSelection = {
	language: "en",
	selectionFeatures: {
		orthography: "Typo",
		coverage: "Partial",
		spelling: "Variant",
	},
	spelledSelection: "gvae",

	surface: englishGiveUpInflectionSurface,
} satisfies Selection<"en", "Inflection", "Lexeme", "VERB">;
