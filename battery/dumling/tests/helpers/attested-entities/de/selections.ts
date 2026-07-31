import type { SegmentedSentenceId, Selection } from "../../../../src/types";
import { germanAufJedenFallLemma, germanBVGLemma } from "./lemmas";

const aufJedenFallSentenceId =
	"test:de:ich-komme-auf-jeden-fall-morgen:v1" as SegmentedSentenceId;

const aufJedenFallSurface = {
	language: "de",
	normalizedSurface: "auf jeden Fall",
	spelling: "Canonical",
	realizationCoverage: "Full",
	surfaceKind: "Citation",
	lemma: germanAufJedenFallLemma,
	surfaceFeatures: null,
} as const;

// Attestation: "Ich komme [auf jeden Fall] morgen."
export const germanAufJedenFallDiscourseFormulaSelection = {
	segmentedSentenceId: aufJedenFallSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4, 6, 8],
	attestedSurface: "auf jeden Fall",
	selectedOrthography: "Standard",
	surface: aufJedenFallSurface,
} satisfies Selection<"de", "Citation", "Phraseme", "DiscourseFormula">;

// Attestation: "Ich komme auf [jeden Fall] morgen."
export const germanAufJedenFallClickedJedenSelection = {
	segmentedSentenceId: aufJedenFallSentenceId,
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [4, 6, 8],
	attestedSurface: "auf jeden Fall",
	selectedOrthography: "Standard",
	surface: aufJedenFallSurface,
} satisfies Selection<"de", "Citation", "Phraseme", "DiscourseFormula">;

// Attestation: "In Berlin ... betreibt die [BVG] die U-Bahn Berlin ..."
export const germanBVGAbbreviationSelection = {
	segmentedSentenceId: "test:de:in-berlin-bvg:v1" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "BVG",
	selectedOrthography: "Standard",
	surface: {
		language: "de",
		normalizedSurface: "BVG",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: germanBVGLemma,
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "PROPN">;
