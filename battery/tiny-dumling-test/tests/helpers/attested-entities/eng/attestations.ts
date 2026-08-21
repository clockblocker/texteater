import type { Attestation } from "../../../../src/types";
import {
	englishGiveUpInflectionSurface,
	englishWalkCitationSurface,
	englishWalkInflectionSurface,
} from "./surfaces";

// Attestation: "They [walk] home together."
export const englishWalkStandardFullAttestation = {
	members: [{ attested: "walk", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: englishWalkInflectionSurface,
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
	surface: englishGiveUpInflectionSurface,
} satisfies Attestation<"en", "Inflection", "Lexeme", "VERB">;
