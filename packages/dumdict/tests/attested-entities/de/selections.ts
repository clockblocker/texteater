import { dumling, type Selection } from "../../../src";
import { germanAufJedenFallLemma, germanBVGLemma } from "./lemmas";

// Attestation: "Ich komme [auf jeden Fall] morgen."
export const germanAufJedenFallDiscourseFormulaSelection = {
	language: "de",
	orthographicStatus: "Standard",
	selectionCoverage: "Full",
	spelledSelection: "auf jeden Fall",
	spellingRelation: "Canonical",
	surface: dumling.de.convert.lemma.toSurface(germanAufJedenFallLemma),
} satisfies Selection<
	"de",
	"Standard",
	"Lemma",
	"Phraseme",
	"DiscourseFormula"
>;

// Attestation: "Ich komme auf [jeden Fall] morgen."
export const germanAufJedenFallPartialSelection = {
	language: "de",
	orthographicStatus: "Standard",
	selectionCoverage: "Partial",
	spelledSelection: "jeden Fall",
	spellingRelation: "Canonical",
	surface: dumling.de.convert.lemma.toSurface(germanAufJedenFallLemma),
} satisfies Selection<
	"de",
	"Standard",
	"Lemma",
	"Phraseme",
	"DiscourseFormula"
>;

// Attestation: "In Berlin sowie im Umland (Agglomeration Berlin) betreibt die [BVG] die U-Bahn Berlin, die Straßenbahn Berlin, den Busverkehr in Berlin und den Fährverkehr in Berlin, nicht jedoch die S-Bahn."
export const germanBVGAbbreviationSelection = {
	language: "de",
	orthographicStatus: "Standard",
	selectionCoverage: "Full",
	spelledSelection: "BVG",
	spellingRelation: "Canonical",
	surface: dumling.de.convert.lemma.toSurface(germanBVGLemma),
} satisfies Selection<"de", "Standard", "Lemma", "Lexeme", "PROPN">;
