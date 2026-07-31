import type { Surface } from "../../../../src/types";
import { germanHausLemma } from "./lemmas";

// Attestation: "Das [Haus] steht leer."
export const germanHausCitationSurface = {
	language: "de",
	normalizedSurface: "Haus",
	spelling: "Canonical",
	realizationCoverage: "Full",
	surfaceKind: "Citation",
	lemma: germanHausLemma,

	surfaceFeatures: null,
} satisfies Surface<"de", "Citation", "Lexeme", "NOUN">;
