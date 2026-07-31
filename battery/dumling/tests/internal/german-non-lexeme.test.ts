import { describe, expect, it } from "bun:test";
import { schemasFor } from "../../src/schema";
import {
	germanAbPrefixLemma,
	germanAufJedenFallClickedJedenSelection,
	germanAufJedenFallDiscourseFormulaSelection,
	makeConstructionSurfaceReference,
	makeMorphemeSurfaceReference,
} from "../helpers";

describe("German non-lexeme schemas", () => {
	it("accept German morpheme and phraseme entities", () => {
		expect(
			schemasFor.de.entity.Lemma.Morpheme.Prefix().safeParse(
				germanAbPrefixLemma,
			).success,
		).toBe(true);
		expect(
			schemasFor.de.entity.Selection.Citation.Phraseme.DiscourseFormula().safeParse(
				germanAufJedenFallDiscourseFormulaSelection,
			).success,
		).toBe(true);
		expect(
			schemasFor.de.entity.Selection.Citation.Phraseme.DiscourseFormula().safeParse(
				germanAufJedenFallClickedJedenSelection,
			).success,
		).toBe(true);
	});

	it("keeps discourse-formula features scoped to discourse formulas", () => {
		expect(
			schemasFor.de.entity.Lemma.Phraseme.DiscourseFormula().safeParse({
				language: "de",
				canonicalForm: "auf jeden fall",
				family: "Phraseme",
				kind: "DiscourseFormula",
				coreFeatures: {
					discourseFormulaRole: "Reaction",
				},
			}).success,
		).toBe(true);

		expect(
			schemasFor.de.entity.Lemma.Phraseme.Aphorism().safeParse({
				language: "de",
				canonicalForm: "zeit ist geld",
				family: "Phraseme",
				kind: "Aphorism",
				coreFeatures: {
					discourseFormulaRole: "Reaction",
				},
			}).success,
		).toBe(false);
	});

	it("keeps non-lexeme branches lemma-only", () => {
		expect(
			typeof schemasFor.de.entity.Selection.Citation.Morpheme.Prefix()
				.parse,
		).toBe("function");
		expect("Morpheme" in schemasFor.de.entity.Selection.Inflection).toBe(
			false,
		);
		expect(
			"Construction" in schemasFor.de.entity.Selection.Inflection,
		).toBe(false);
		expect(
			schemasFor.de.entity.Selection.Citation.Morpheme.Suffix().safeParse(
				{
					segmentedSentenceId: "test:fixture-sentence" as never,
					clickedSegmentIndex: 0,
					surfaceSegmentIndices: [0],
					attestedSurface: "hait",
					selectedOrthography: "Typo",

					surface: {
						...makeMorphemeSurfaceReference("de", "Suffix", "heit"),
						language: "de",
						normalizedSurface: "heit",
						spelling: "Canonical",
						realizationCoverage: "Full",
						surfaceKind: "Citation",
					},
				},
			).success,
		).toBe(true);
	});

	it("accepts construction entities as citation-only lemmas", () => {
		expect(
			schemasFor.de.entity.Lemma.Construction.Fusion().safeParse({
				language: "de",
				canonicalForm: "zum",
				family: "Construction",
				kind: "Fusion",
				coreFeatures: {},
			}).success,
		).toBe(true);

		expect(
			schemasFor.de.entity.Selection.Citation.Construction.Fusion().safeParse(
				{
					segmentedSentenceId: "test:fixture-sentence" as never,
					clickedSegmentIndex: 0,
					surfaceSegmentIndices: [0],
					attestedSurface: "zum",
					selectedOrthography: "Standard",

					surface: {
						...makeConstructionSurfaceReference(
							"de",
							"Fusion",
							"zum",
						),
						language: "de",
						normalizedSurface: "zum",
						spelling: "Canonical",
						realizationCoverage: "Full",
						surfaceKind: "Citation",
					},
				},
			).success,
		).toBe(true);
	});
});
