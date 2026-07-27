import { describe, expect, it } from "bun:test";
import { schemasFor } from "../../src/schema";
import { makeLexemeSurfaceReference } from "../helpers";

describe("German verb schemas", () => {
	it("accept supported verb inflectional and inherent features", () => {
		expect(
			schemasFor.de.entity.Selection.Inflection.Lexeme.VERB().safeParse({
				language: "de",
				spelledSelection: "ging",

				surface: {
					...makeLexemeSurfaceReference("de", "VERB", "gehen"),
					language: "de",
					normalizedFullSurface: "ging",
					surfaceKind: "Inflection",
					inflectionalFeatures: {
						mood: "Sub",
						number: "Sing",
						person: "3",
						tense: "Past",
						verbForm: "Fin",
					},
				},
			}).success,
		).toBe(true);

		expect(
			schemasFor.de.entity.Lemma.Lexeme.VERB().safeParse({
				language: "de",
				canonicalLemma: "mitkommen",
				lemmaKind: "Lexeme",
				lemmaSubKind: "VERB",
				inherentFeatures: {
					hasSepPrefix: "mit",
				},
				meaningInEmojis: "🚶",
			}).success,
		).toBe(true);
	});

	it("rejects unsupported inherited features and impossible inflection combinations", () => {
		expect(
			schemasFor.de.entity.Lemma.Lexeme.VERB().safeParse({
				language: "de",
				canonicalLemma: "mitkommen",
				lemmaKind: "Lexeme",
				lemmaSubKind: "VERB",
				inherentFeatures: {
					phrasal: "Yes",
				},
				meaningInEmojis: "🚶",
			}).success,
		).toBe(false);

		expect(
			schemasFor.de.entity.Lemma.Lexeme.VERB().safeParse({
				language: "de",
				canonicalLemma: "sich beeilen",
				lemmaKind: "Lexeme",
				lemmaSubKind: "VERB",
				inherentFeatures: {
					reflex: "Yes",
				},
				meaningInEmojis: "🏃",
			}).success,
		).toBe(false);

		expect(
			schemasFor.de.entity.Selection.Inflection.Lexeme.VERB().safeParse({
				language: "de",
				spelledSelection: "geht",

				surface: {
					...makeLexemeSurfaceReference("de", "VERB", "gehen"),
					language: "de",
					normalizedFullSurface: "geht",
					surfaceKind: "Inflection",
					inflectionalFeatures: {
						gender: "Fem",
						mood: "Ind",
						number: "Sing",
						person: "3",
						tense: "Pres",
						verbForm: "Fin",
					},
				},
			}).success,
		).toBe(false);

		expect(
			schemasFor.de.entity.Selection.Inflection.Lexeme.VERB().safeParse({
				language: "de",
				spelledSelection: "geh",

				surface: {
					...makeLexemeSurfaceReference("de", "VERB", "gehen"),
					language: "de",
					normalizedFullSurface: "geh",
					surfaceKind: "Inflection",
					inflectionalFeatures: {
						mood: "Imp",
						tense: "Past",
						verbForm: "Fin",
					},
				},
			}).success,
		).toBe(false);
	});

	it("keeps the verb registry branch exposed", () => {
		expect(typeof schemasFor.de.entity.Lemma.Lexeme.VERB().parse).toBe(
			"function",
		);
		expect(
			typeof schemasFor.de.entity.Selection.Inflection.Lexeme.VERB()
				.parse,
		).toBe("function");
	});
});
