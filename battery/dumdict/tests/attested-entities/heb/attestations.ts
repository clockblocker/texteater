import type * as Dumling from "dumling/types";

import {
	hebrewKatvuAttestedInflectionSurface,
	hebrewShanaCitationSurface,
	hebrewUsAbbreviationCitationSurface,
} from "./surfaces";

// Attestation: "הם [כתבו] מכתב."
export const hebrewKatvuStandardFullAttestation = {
	unitKind: "Attestation" as const,
	members: [{ attested: "כתבו", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: hebrewKatvuAttestedInflectionSurface,
} satisfies Dumling.Attestation<"he", "Lexeme", "VERB">;

// Attestation: "עוד [שנה] עברה."
export const hebrewShanaCitationAttestation = {
	unitKind: "Attestation" as const,
	members: [{ attested: "שנה", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: hebrewShanaCitationSurface,
} satisfies Dumling.Attestation<"he", "Lexeme", "NOUN">;

// Attestation: "[ארה״ב] הודיעה על צעד חדש."
export const hebrewUsAbbreviationAttestation = {
	unitKind: "Attestation" as const,
	members: [{ attested: "ארה״ב", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: hebrewUsAbbreviationCitationSurface,
} satisfies Dumling.Attestation<"he", "Lexeme", "PROPN">;

// Attestation: "הם [כָּתְבוּ] מכתב."
export const hebrewKatvuPointedVariantAttestation = {
	unitKind: "Attestation" as const,
	members: [{ attested: "כָּתְבוּ", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: {
		...hebrewKatvuAttestedInflectionSurface,
		normalizedSurface: "כָּתְבוּ",
		spelling: "Variant",
	},
} satisfies Dumling.Attestation<"he", "Lexeme", "VERB">;
