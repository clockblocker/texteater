import type { Selection } from "../../../../src/types";
import { germanAufJedenFallLemma, germanBVGLemma } from "./lemmas";

// Attestation: "Ich komme [auf jeden Fall] morgen."
export const germanAufJedenFallDiscourseFormulaSelection = {
	language: "de",
	spelledSelection: "auf jeden Fall",

	surface: {
		language: "de",
		normalizedFullSurface: "auf jeden Fall",
		surfaceKind: "Citation",
		lemma: germanAufJedenFallLemma,

		surfaceFeatures: null,
	},

	selectionFeatures: null,
} satisfies Selection<"de", "Citation", "Phraseme", "DiscourseFormula">;

// Attestation: "Ich komme auf [jeden Fall] morgen."
export const germanAufJedenFallPartialSelection = {
	language: "de",
	selectionFeatures: {
		coverage: "Partial",
		orthography: null,
		spelling: null,
	},
	spelledSelection: "jeden Fall",

	surface: {
		language: "de",
		normalizedFullSurface: "auf jeden Fall",
		surfaceKind: "Citation",
		lemma: germanAufJedenFallLemma,

		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Phraseme", "DiscourseFormula">;

// Attestation: "In Berlin ... betreibt die [BVG] die U-Bahn Berlin ..."
export const germanBVGAbbreviationSelection = {
	language: "de",
	spelledSelection: "BVG",

	surface: {
		language: "de",
		normalizedFullSurface: "BVG",
		surfaceKind: "Citation",
		lemma: germanBVGLemma,

		surfaceFeatures: null,
	},

	selectionFeatures: null,
} satisfies Selection<"de", "Citation", "Lexeme", "PROPN">;
