import type { Attestation } from "dumling/types";
import { germanAufJedenFallLemma, germanBVGLemma } from "./lemmas";

const aufJedenFallSurface = {
	language: "de",
	normalizedSurface: "auf jeden Fall",
	spelling: "Canonical",
	surfaceKind: "Citation",
	lemma: germanAufJedenFallLemma,
	surfaceFeatures: null,
} as const;

// Attestation: "Ich komme [auf] [jeden] [Fall] morgen."
export const germanAufJedenFallFullAttestation = {
	members: [
		{ attested: "auf", orthography: "Standard" },
		{ attested: "jeden", orthography: "Standard" },
		{ attested: "Fall", orthography: "Standard" },
	],
	realizationCoverage: "Full",
	surface: aufJedenFallSurface,
} satisfies Attestation<"de", "Citation", "Phraseme", "DiscourseFormula">;

// Attestation: "In Berlin ... betreibt die [BVG] die U-Bahn Berlin ..."
export const germanBVGAbbreviationAttestation = {
	members: [{ attested: "BVG", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "BVG",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: germanBVGLemma,
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "PROPN">;
