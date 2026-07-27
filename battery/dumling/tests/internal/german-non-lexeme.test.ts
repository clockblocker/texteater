import { describe, expect, it } from "bun:test";
import { schemasFor } from "../../src/schema";
import {
	germanAbPrefixLemma,
	germanAufJedenFallDiscourseFormulaSelection,
	germanAufJedenFallPartialSelection,
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
				germanAufJedenFallPartialSelection,
			).success,
		).toBe(true);
	});

	it("keeps discourse-formula features scoped to discourse formulas", () => {
		expect(
			schemasFor.de.entity.Lemma.Phraseme.DiscourseFormula().safeParse({
				language: "de",
				canonicalLemma: "auf jeden fall",
				lemmaKind: "Phraseme",
				lemmaSubKind: "DiscourseFormula",
				inherentFeatures: {
					discourseFormulaRole: "Reaction",
				},
				meaningInEmojis: "✅",
			}).success,
		).toBe(true);

		expect(
			schemasFor.de.entity.Lemma.Phraseme.Aphorism().safeParse({
				language: "de",
				canonicalLemma: "zeit ist geld",
				lemmaKind: "Phraseme",
				lemmaSubKind: "Aphorism",
				inherentFeatures: {
					discourseFormulaRole: "Reaction",
				},
				meaningInEmojis: "⏳💰",
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
					language: "de",
					selectionFeatures: { orthography: "Typo" },
					spelledSelection: "hait",

					surface: {
						...makeMorphemeSurfaceReference("de", "Suffix", "heit"),
						language: "de",
						normalizedFullSurface: "heit",
						surfaceKind: "Citation",
					},
				},
			).success,
		).toBe(true);
	});

	it("accepts construction entities as citation-only entries", () => {
		expect(
			schemasFor.de.entity.Lemma.Construction.Fusion().safeParse({
				language: "de",
				canonicalLemma: "zum",
				lemmaKind: "Construction",
				lemmaSubKind: "Fusion",
				inherentFeatures: {},
				meaningInEmojis: "➡️",
			}).success,
		).toBe(true);

		expect(
			schemasFor.de.entity.Selection.Citation.Construction.Fusion().safeParse(
				{
					language: "de",
					spelledSelection: "zum",

					surface: {
						...makeConstructionSurfaceReference(
							"de",
							"Fusion",
							"zum",
						),
						language: "de",
						normalizedFullSurface: "zum",
						surfaceKind: "Citation",
					},
				},
			).success,
		).toBe(true);
	});
});
