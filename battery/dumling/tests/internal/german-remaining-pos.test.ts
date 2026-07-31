import { describe, expect, it } from "bun:test";
import { schemasFor } from "../../src/schema";
import { makeLexemeSurfaceReference } from "../helpers";

describe("German remaining POS schemas", () => {
	it("accepts representative feature bundles across implemented POS classes", () => {
		expect(
			schemasFor.de.entity.Selection.Inflection.Lexeme.ADJ().safeParse({
				segmentedSentenceId: "test:fixture-sentence" as never,
				clickedSegmentIndex: 0,
				surfaceSegmentIndices: [0],
				attestedSurface: "kleiner",
				selectedOrthography: "Standard",

				surface: {
					...makeLexemeSurfaceReference("de", "ADJ", "klein"),
					language: "de",
					normalizedSurface: "kleiner",
					spelling: "Canonical",
					realizationCoverage: "Full",
					surfaceKind: "Inflection",
					inflectionalFeatures: {
						case: "Dat",
						degree: "Cmp",
						gender: "Fem",
						number: "Sing",
					},
				},
			}).success,
		).toBe(true);

		expect(
			schemasFor.de.entity.Lemma.Lexeme.ADP().safeParse({
				language: "de",
				canonicalForm: "zu",
				family: "Lexeme",
				kind: "ADP",
				coreFeatures: {
					abbr: null,
					adpType: null,
					extPos: null,
					foreign: null,
					governedCase: "Dat",
					partType: null,
				},
			}).success,
		).toBe(true);

		expect(
			schemasFor.de.entity.Selection.Inflection.Lexeme.DET().safeParse({
				segmentedSentenceId: "test:fixture-sentence" as never,
				clickedSegmentIndex: 0,
				surfaceSegmentIndices: [0],
				attestedSurface: "dieser",
				selectedOrthography: "Standard",

				surface: {
					...makeLexemeSurfaceReference("de", "DET", "dies"),
					language: "de",
					normalizedSurface: "dieser",
					spelling: "Canonical",
					realizationCoverage: "Full",
					surfaceKind: "Inflection",
					inflectionalFeatures: {
						case: "Nom",
						degree: null,
						gender: "Masc",
						"gender[psor]": null,
						number: "Sing",
						"number[psor]": null,
					},
				},
			}).success,
		).toBe(true);

		expect(
			schemasFor.de.entity.Lemma.Lexeme.X().safeParse({
				language: "de",
				canonicalForm: "foobar",
				family: "Lexeme",
				kind: "X",
				coreFeatures: {
					abbr: null,
					foreign: "Yes",
					hyph: null,
					numType: null,
				},
			}).success,
		).toBe(true);
	});

	it("keeps non-inflecting classes strict", () => {
		expect("ADP" in schemasFor.de.entity.Selection.Inflection.Lexeme).toBe(
			false,
		);
		expect(
			"CCONJ" in schemasFor.de.entity.Selection.Inflection.Lexeme,
		).toBe(false);
		expect("INTJ" in schemasFor.de.entity.Selection.Inflection.Lexeme).toBe(
			false,
		);
		expect(
			"PUNCT" in schemasFor.de.entity.Selection.Inflection.Lexeme,
		).toBe(false);
		expect(
			"SCONJ" in schemasFor.de.entity.Selection.Inflection.Lexeme,
		).toBe(false);
	});

	it("rejects unsupported feature values where subsets matter", () => {
		expect(
			schemasFor.de.entity.Lemma.Lexeme.ADV().safeParse({
				language: "de",
				canonicalForm: "gern",
				family: "Lexeme",
				kind: "ADV",
				coreFeatures: {
					pronType: "Prs",
				},
			}).success,
		).toBe(false);

		expect(
			Reflect.get(
				schemasFor.de.entity.Selection.Inflection.Lexeme,
				"ADP",
			),
		).toBeUndefined();

		expect(
			schemasFor.de.entity.Selection.Inflection.Lexeme.X().safeParse({
				segmentedSentenceId: "test:fixture-sentence" as never,
				clickedSegmentIndex: 0,
				surfaceSegmentIndices: [0],
				attestedSurface: "foobar",
				selectedOrthography: "Standard",

				surface: {
					...makeLexemeSurfaceReference("de", "X", "foobar"),
					language: "de",
					normalizedSurface: "foobar",
					spelling: "Canonical",
					realizationCoverage: "Full",
					surfaceKind: "Inflection",
					inflectionalFeatures: {
						tense: "Past",
					},
				},
			}).success,
		).toBe(false);
	});
});
