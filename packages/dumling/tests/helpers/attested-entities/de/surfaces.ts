import type { Surface } from "../../../../src/types";
import { germanHausLemma } from "./lemmas";

// Attestation: "Das [Haus] steht leer."
export const germanHausCitationSurface = {
	language: "de",
	normalizedFullSurface: "Haus",
	surfaceKind: "Citation",
	lemma: germanHausLemma,
} satisfies Surface<"de", "Citation", "Lexeme", "NOUN">;
