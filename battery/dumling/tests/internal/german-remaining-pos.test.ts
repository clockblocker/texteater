import { describe, expect, it } from "bun:test";
import { schemasFor } from "../../src/schema";
import { makeLexemeSurfaceReference } from "../helpers";

describe("German remaining POS schemas", () => {
	it("accepts representative feature bundles across implemented POS classes", () => {
		expect(
			schemasFor.de.entity.Selection.Inflection.Lexeme.ADJ().safeParse({
				language: "de",
				selectionFeatures: null,
				spelledSelection: "kleiner",

				surface: {
					...makeLexemeSurfaceReference("de", "ADJ", "klein"),
					language: "de",
					normalizedFullSurface: "kleiner",
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
				canonicalLemma: "zu",
				lemmaKind: "Lexeme",
				lemmaSubKind: "ADP",
				inherentFeatures: {
					abbr: null,
					adpType: null,
					extPos: null,
					foreign: null,
					governedCase: "Dat",
					partType: null,
				},
				meaningInEmojis: "➡️",
			}).success,
		).toBe(true);

		expect(
			schemasFor.de.entity.Selection.Inflection.Lexeme.DET().safeParse({
				language: "de",
				selectionFeatures: null,
				spelledSelection: "dieser",

				surface: {
					...makeLexemeSurfaceReference("de", "DET", "dies"),
					language: "de",
					normalizedFullSurface: "dieser",
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
				canonicalLemma: "foobar",
				lemmaKind: "Lexeme",
				lemmaSubKind: "X",
				inherentFeatures: {
					abbr: null,
					foreign: "Yes",
					hyph: null,
					numType: null,
				},
				meaningInEmojis: "❓",
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
				canonicalLemma: "gern",
				lemmaKind: "Lexeme",
				lemmaSubKind: "ADV",
				inherentFeatures: {
					pronType: "Prs",
				},
				meaningInEmojis: "😊",
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
				language: "de",
				spelledSelection: "foobar",

				surface: {
					...makeLexemeSurfaceReference("de", "X", "foobar"),
					language: "de",
					normalizedFullSurface: "foobar",
					surfaceKind: "Inflection",
					inflectionalFeatures: {
						tense: "Past",
					},
				},
			}).success,
		).toBe(false);
	});
});
