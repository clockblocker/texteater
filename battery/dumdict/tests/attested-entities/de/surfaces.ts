import type { Surface } from "../../../src";
import { germanHausLemma } from "./lemmas";

// Attestation: "Das [Haus] steht leer."
export const germanHausCitationSurface = {
	language: "de",
	normalizedSurface: "Haus",
	surfaceKind: "Citation",
	lemma: germanHausLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
	realizationCoverage: "Full",
} satisfies Surface<"de", "Citation", "Lexeme", "NOUN">;
