import type * as Dumling from "dumling/types";

import { germanHausLemma } from "./lemmas";

// Attestation: "Das [Haus] steht leer."
export const germanHausCitationSurface = {
	unitKind: "Surface" as const,
	inflectionalFeatures: null,

	language: "de",
	normalizedSurface: "Haus",

	lemma: germanHausLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Dumling.Surface<"de", "Lexeme", "NOUN">;
