import { describe, expect, it } from "bun:test";
import { schemasFor } from "../../src/schema";
import { makeLexemeSurfaceReference } from "../helpers";

describe("English schema specificity", () => {
	it("keeps English adjective and noun morphology narrow", () => {
		expect(
			schemasFor.en.entity.Selection.Inflection.Lexeme.ADJ().safeParse({
				segmentedSentenceId: "test:fixture-sentence" as never,
				clickedSegmentIndex: 0,
				surfaceSegmentIndices: [0],
				attestedSurface: "smaller",
				selectedOrthography: "Standard",

				surface: {
					...makeLexemeSurfaceReference("en", "ADJ", "small"),
					language: "en",
					normalizedSurface: "smaller",
					spelling: "Canonical",
					realizationCoverage: "Full",
					surfaceKind: "Inflection",
					inflectionalFeatures: {
						degree: "Cmp",
					},
				},
			}).success,
		).toBe(true);

		expect(
			schemasFor.en.entity.Selection.Inflection.Lexeme.ADJ().safeParse({
				segmentedSentenceId: "test:fixture-sentence" as never,
				clickedSegmentIndex: 0,
				surfaceSegmentIndices: [0],
				attestedSurface: "small",
				selectedOrthography: "Standard",

				surface: {
					...makeLexemeSurfaceReference("en", "ADJ", "small"),
					language: "en",
					normalizedSurface: "small",
					spelling: "Canonical",
					realizationCoverage: "Full",
					surfaceKind: "Inflection",
					inflectionalFeatures: {
						case: "Dat",
					},
				},
			}).success,
		).toBe(false);

		expect(
			schemasFor.en.entity.Selection.Inflection.Lexeme.NOUN().safeParse({
				segmentedSentenceId: "test:fixture-sentence" as never,
				clickedSegmentIndex: 0,
				surfaceSegmentIndices: [0],
				attestedSurface: "scissors",
				selectedOrthography: "Standard",

				surface: {
					...makeLexemeSurfaceReference("en", "NOUN", "scissors"),
					language: "en",
					normalizedSurface: "scissors",
					spelling: "Canonical",
					realizationCoverage: "Full",
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
				canonicalForm: "dog",
				family: "Lexeme",
				kind: "NOUN",
				coreFeatures: {
					gender: "Masc",
				},
			}).success,
		).toBe(false);
	});

	it("removes German-only verb morphology from English", () => {
		expect(
			schemasFor.en.entity.Lemma.Lexeme.VERB().safeParse({
				language: "en",
				canonicalForm: "look",
				family: "Lexeme",
				kind: "VERB",
				coreFeatures: {
					abbr: null,
					extPos: null,
					hasGovPrep: "to",
					phrasal: "Yes",
					style: null,
				},
			}).success,
		).toBe(true);

		expect(
			schemasFor.en.entity.Lemma.Lexeme.VERB().safeParse({
				language: "en",
				canonicalForm: "wash",
				family: "Lexeme",
				kind: "VERB",
				coreFeatures: {
					hasSepPrefix: "up",
				},
			}).success,
		).toBe(false);

		expect(
			schemasFor.en.entity.Selection.Inflection.Lexeme.VERB().safeParse({
				segmentedSentenceId: "test:fixture-sentence" as never,
				clickedSegmentIndex: 0,
				surfaceSegmentIndices: [0],
				attestedSurface: "washing",
				selectedOrthography: "Standard",

				surface: {
					...makeLexemeSurfaceReference("en", "VERB", "wash"),
					language: "en",
					normalizedSurface: "washing",
					spelling: "Canonical",
					realizationCoverage: "Full",
					surfaceKind: "Inflection",
					inflectionalFeatures: {
						mood: null,
						number: null,
						person: null,
						tense: null,
						verbForm: "Ger",
						voice: null,
					},
				},
			}).success,
		).toBe(true);

		expect(
			schemasFor.en.entity.Selection.Inflection.Lexeme.VERB().safeParse({
				segmentedSentenceId: "test:fixture-sentence" as never,
				clickedSegmentIndex: 0,
				surfaceSegmentIndices: [0],
				attestedSurface: "washed",
				selectedOrthography: "Standard",

				surface: {
					...makeLexemeSurfaceReference("en", "VERB", "wash"),
					language: "en",
					normalizedSurface: "washed",
					spelling: "Canonical",
					realizationCoverage: "Full",
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
				segmentedSentenceId: "test:fixture-sentence" as never,
				clickedSegmentIndex: 0,
				surfaceSegmentIndices: [0],
				attestedSurface: "him",
				selectedOrthography: "Standard",

				surface: {
					...makeLexemeSurfaceReference("en", "PRON", "him"),
					language: "en",
					normalizedSurface: "him",
					spelling: "Canonical",
					realizationCoverage: "Full",
					surfaceKind: "Inflection",
					inflectionalFeatures: {
						case: "Acc",
						gender: null,
						number: null,
						reflex: null,
					},
				},
			}).success,
		).toBe(true);

		expect(
			schemasFor.en.entity.Lemma.Lexeme.DET().safeParse({
				language: "en",
				canonicalForm: "half",
				family: "Lexeme",
				kind: "DET",
				coreFeatures: {
					abbr: "Yes",
					definite: null,
					extPos: "ADV",
					numForm: "Word",
					numType: "Frac",
					pronType: "Rcp",
					style: "Vrnc",
				},
			}).success,
		).toBe(true);

		expect(
			schemasFor.en.entity.Selection.Inflection.Lexeme.SYM().safeParse({
				segmentedSentenceId: "test:fixture-sentence" as never,
				clickedSegmentIndex: 0,
				surfaceSegmentIndices: [0],
				attestedSurface: "%",
				selectedOrthography: "Standard",

				surface: {
					...makeLexemeSurfaceReference("en", "SYM", "%"),
					language: "en",
					normalizedSurface: "%",
					spelling: "Canonical",
					realizationCoverage: "Full",
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
