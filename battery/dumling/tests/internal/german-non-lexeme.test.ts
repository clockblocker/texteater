import { describe, expect, it } from "bun:test";
import { schemasFor } from "../../src/schema";
import {
	germanAbPrefixLemma,
	germanAufJedenFallFullAttestation,
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
			schemasFor.de.entity.Attestation.Citation.Phraseme.DiscourseFormula().safeParse(
				germanAufJedenFallFullAttestation,
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
			typeof schemasFor.de.entity.Attestation.Citation.Morpheme.Prefix()
				.parse,
		).toBe("function");
		expect("Morpheme" in schemasFor.de.entity.Attestation.Inflection).toBe(
			false,
		);
		expect(
			"Construction" in schemasFor.de.entity.Attestation.Inflection,
		).toBe(false);
		expect(
			schemasFor.de.entity.Attestation.Citation.Morpheme.Suffix().safeParse(
				{
					members: [{ attested: "hait", orthography: "Typo" }],
					realizationCoverage: "Full",

					surface: {
						...makeMorphemeSurfaceReference("de", "Suffix", "heit"),
						language: "de",
						normalizedSurface: "heit",
						spelling: "Canonical",
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
			schemasFor.de.entity.Attestation.Citation.Construction.Fusion().safeParse(
				{
					members: [{ attested: "zum", orthography: "Standard" }],
					realizationCoverage: "Full",

					surface: {
						...makeConstructionSurfaceReference(
							"de",
							"Fusion",
							"zum",
						),
						language: "de",
						normalizedSurface: "zum",
						spelling: "Canonical",
						surfaceKind: "Citation",
					},
				},
			).success,
		).toBe(true);
	});
});
