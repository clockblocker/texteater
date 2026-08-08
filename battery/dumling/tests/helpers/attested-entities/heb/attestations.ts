import type { Attestation } from "../../../../src/types";
import {
	hebrewKatvuInflectionSurface,
	hebrewShanaCitationSurface,
	hebrewUsAbbreviationCitationSurface,
} from "./surfaces";

// Attestation: "הם [כתבו] מכתב."
export const hebrewKatvuStandardFullAttestation = {
	members: [{ attested: "כתבו", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: hebrewKatvuInflectionSurface,
} satisfies Attestation<"he", "Inflection", "Lexeme", "VERB">;

// Attestation: "עוד [שנה] עברה."
export const hebrewShanaCitationAttestation = {
	members: [{ attested: "שנה", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: hebrewShanaCitationSurface,
} satisfies Attestation<"he", "Citation", "Lexeme", "NOUN">;

// Attestation: "[ארה״ב] הודיעה על צעד חדש."
export const hebrewUsAbbreviationAttestation = {
	members: [{ attested: "ארה״ב", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: hebrewUsAbbreviationCitationSurface,
} satisfies Attestation<"he", "Citation", "Lexeme", "PROPN">;

// Attestation: "הם [כָּתְבוּ] מכתב."
export const hebrewKatvuPointedVariantAttestation = {
	members: [{ attested: "כָּתְבוּ", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: {
		...hebrewKatvuInflectionSurface,
		normalizedSurface: "כָּתְבוּ",
		spelling: "Variant",
	},
} satisfies Attestation<"he", "Inflection", "Lexeme", "VERB">;
