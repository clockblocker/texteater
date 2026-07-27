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
} satisfies Selection<"en", "Inflection", "Lexeme", "VERB">;

// Attestation: "They [walk] home together."
export const englishWalkCitationSelection = {
	language: "en",
	spelledSelection: "walk",

	surface: englishWalkCitationSurface,
} satisfies Selection<"en", "Citation", "Lexeme", "VERB">;

// Attestation: "Mark gvae [up] on it."
export const englishGiveUpTypoPartialUpSelection = {
	language: "en",
	selectionFeatures: { orthography: "Typo", coverage: "Partial" },
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
