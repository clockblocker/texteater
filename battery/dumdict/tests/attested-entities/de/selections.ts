import { dumling, type Selection } from "../../../src";
import { germanAufJedenFallLemma, germanBVGLemma } from "./lemmas";

// Attestation: "Ich komme [auf jeden Fall] morgen."
export const germanAufJedenFallDiscourseFormulaSelection = {
	segmentedSentenceId: dumling.de.create.segmentedSentenceId(
		"test:ich-komme-auf-jeden-fall-morgen",
	),
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4, 6, 8],
	selectedOrthography: "Standard",
	attestedSurface: "auf jeden Fall",
	surface: dumling.de.convert.lemma.toSurface(germanAufJedenFallLemma),
} satisfies Selection<"de", "Citation", "Phraseme", "DiscourseFormula">;

// Attestation: "Ich komme auf [jeden Fall] morgen."
export const germanAufJedenFallClickedJedenSelection = {
	segmentedSentenceId: dumling.de.create.segmentedSentenceId(
		"test:ich-komme-auf-jeden-fall-morgen",
	),
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [4, 6, 8],
	selectedOrthography: "Standard",
	attestedSurface: "auf jeden Fall",
	surface: dumling.de.convert.lemma.toSurface(germanAufJedenFallLemma),
} satisfies Selection<"de", "Citation", "Phraseme", "DiscourseFormula">;

// Attestation: "In Berlin sowie im Umland (Agglomeration Berlin) betreibt die [BVG] die U-Bahn Berlin, die Straßenbahn Berlin, den Busverkehr in Berlin und den Fährverkehr in Berlin, nicht jedoch die S-Bahn."
export const germanBVGAbbreviationSelection = {
	segmentedSentenceId: dumling.de.create.segmentedSentenceId(
		"test:germanBVGAbbreviationSelection",
	),
	clickedSegmentIndex: 20,
	surfaceSegmentIndices: [20],
	selectedOrthography: "Standard",
	attestedSurface: "BVG",
	surface: dumling.de.convert.lemma.toSurface(germanBVGLemma),
} satisfies Selection<"de", "Citation", "Lexeme", "PROPN">;
