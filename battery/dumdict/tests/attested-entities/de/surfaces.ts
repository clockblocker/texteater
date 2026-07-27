import type { Surface } from "../../../src";
import { germanHausLemma } from "./lemmas";

// Attestation: "Das [Haus] steht leer."
export const germanHausResolvedLemmaSurface = {
	language: "de",
	normalizedFullSurface: "Haus",
	surfaceKind: "Lemma",
	lemma: germanHausLemma,
} satisfies Surface<"de", "Lemma", "Lexeme", "NOUN">;
