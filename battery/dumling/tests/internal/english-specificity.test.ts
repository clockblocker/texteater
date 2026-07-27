import { describe, expect, it } from "bun:test";
import { schemasFor } from "../../src/schema";
import { makeLexemeSurfaceReference } from "../helpers";

describe("English schema specificity", () => {
	it("keeps English adjective and noun morphology narrow", () => {
		expect(
			schemasFor.en.entity.Selection.Inflection.Lexeme.ADJ().safeParse({
				language: "en",
				spelledSelection: "smaller",

				surface: {
					...makeLexemeSurfaceReference("en", "ADJ", "small"),
					language: "en",
					normalizedFullSurface: "smaller",
					surfaceKind: "Inflection",
					inflectionalFeatures: {
						degree: "Cmp",
					},
				},
			}).success,
		).toBe(true);

		expect(
			schemasFor.en.entity.Selection.Inflection.Lexeme.ADJ().safeParse({
				language: "en",
				spelledSelection: "small",

				surface: {
					...makeLexemeSurfaceReference("en", "ADJ", "small"),
					language: "en",
					normalizedFullSurface: "small",
					surfaceKind: "Inflection",
					inflectionalFeatures: {
						case: "Dat",
					},
				},
			}).success,
		).toBe(false);

		expect(
			schemasFor.en.entity.Selection.Inflection.Lexeme.NOUN().safeParse({
				language: "en",
				spelledSelection: "scissors",

				surface: {
					...makeLexemeSurfaceReference("en", "NOUN", "scissors"),
					language: "en",
					normalizedFullSurface: "scissors",
					surfaceKind: "Inflection",
					inflectionalFeatures: {
						number: "Ptan",
					},
				},
			}).success,
		).toBe(true);

		expect(
			schemasFor.en.entity.Lemma.Lexeme.NOUN().safeParse({
				language: "en",
				canonicalLemma: "dog",
				lemmaKind: "Lexeme",
				lemmaSubKind: "NOUN",
				inherentFeatures: {
					gender: "Masc",
				},
				meaningInEmojis: "🐕",
			}).success,
		).toBe(false);
	});

	it("removes German-only verb morphology from English", () => {
		expect(
			schemasFor.en.entity.Lemma.Lexeme.VERB().safeParse({
				language: "en",
				canonicalLemma: "look",
				lemmaKind: "Lexeme",
				lemmaSubKind: "VERB",
				inherentFeatures: {
					hasGovPrep: "to",
					phrasal: "Yes",
				},
				meaningInEmojis: "👀",
			}).success,
		).toBe(true);

		expect(
			schemasFor.en.entity.Lemma.Lexeme.VERB().safeParse({
				language: "en",
				canonicalLemma: "wash",
				lemmaKind: "Lexeme",
				lemmaSubKind: "VERB",
				inherentFeatures: {
					hasSepPrefix: "up",
				},
				meaningInEmojis: "🧼",
			}).success,
		).toBe(false);

		expect(
			schemasFor.en.entity.Selection.Inflection.Lexeme.VERB().safeParse({
				language: "en",
				spelledSelection: "washing",

				surface: {
					...makeLexemeSurfaceReference("en", "VERB", "wash"),
					language: "en",
					normalizedFullSurface: "washing",
					surfaceKind: "Inflection",
					inflectionalFeatures: {
						verbForm: "Ger",
					},
				},
			}).success,
		).toBe(true);

		expect(
			schemasFor.en.entity.Selection.Inflection.Lexeme.VERB().safeParse({
				language: "en",
				spelledSelection: "washed",

				surface: {
					...makeLexemeSurfaceReference("en", "VERB", "wash"),
					language: "en",
					normalizedFullSurface: "washed",
					surfaceKind: "Inflection",
					inflectionalFeatures: {
						gender: "Fem",
					},
				},
			}).success,
		).toBe(false);
	});

	it("keeps pronoun, determiner, and symbol features aligned with the English catalog", () => {
		expect(
			schemasFor.en.entity.Selection.Inflection.Lexeme.PRON().safeParse({
				language: "en",
				spelledSelection: "him",

				surface: {
					...makeLexemeSurfaceReference("en", "PRON", "him"),
					language: "en",
					normalizedFullSurface: "him",
					surfaceKind: "Inflection",
					inflectionalFeatures: {
						case: "Acc",
					},
				},
			}).success,
		).toBe(true);

		expect(
			schemasFor.en.entity.Lemma.Lexeme.DET().safeParse({
				language: "en",
				canonicalLemma: "half",
				lemmaKind: "Lexeme",
				lemmaSubKind: "DET",
				inherentFeatures: {
					abbr: "Yes",
					extPos: "ADV",
					numForm: "Word",
					numType: "Frac",
					pronType: "Rcp",
					style: "Vrnc",
				},
				meaningInEmojis: "🧮",
			}).success,
		).toBe(true);

		expect(
			schemasFor.en.entity.Selection.Inflection.Lexeme.SYM().safeParse({
				language: "en",
				spelledSelection: "%",

				surface: {
					...makeLexemeSurfaceReference("en", "SYM", "%"),
					language: "en",
					normalizedFullSurface: "%",
					surfaceKind: "Inflection",
					inflectionalFeatures: {
						number: "Sing",
					},
				},
			}).success,
		).toBe(true);

		expect(
			typeof schemasFor.en.entity.Selection.Inflection.Lexeme.VERB()
				.parse,
		).toBe("function");
	});
});
