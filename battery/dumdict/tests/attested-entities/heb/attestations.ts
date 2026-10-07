import type * as Dumling from "dumling/types";

import { hebrewKatvuAttestedInflectionSurface } from "./surfaces";

// Attestation: "הם [כתבו] מכתב."
export const hebrewKatvuStandardFullAttestation = {
	unitKind: "Attestation" as const,
	members: [{ attested: "כתבו", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: hebrewKatvuAttestedInflectionSurface,
} satisfies Dumling.Attestation<"he", "Lexeme", "VERB">;
