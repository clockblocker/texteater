import { describe, expect, it } from "bun:test";
import { schemasFor } from "../../src/schema";
import { makeLexemeSurfaceReference } from "../helpers";

describe("German verb schemas", () => {
	it("accept supported verb inflectional and core features", () => {
		expect(
			schemasFor.de.entity.Attestation.Inflection.Lexeme.VERB().safeParse(
				{
					members: [{ attested: "ging", orthography: "Standard" }],
					realizationCoverage: "Full",

					surface: {
						...makeLexemeSurfaceReference("de", "VERB", "gehen"),
						language: "de",
						normalizedSurface: "ging",
						spelling: "Canonical",
						surfaceKind: "Inflection",
						inflectionalFeatures: {
							mood: "Sub",
							number: "Sing",
							person: "3",
							tense: "Past",
							verbForm: "Fin",
							voice: null,
						},
					},
				},
			).success,
		).toBe(true);

		expect(
			schemasFor.de.entity.Lemma.Lexeme.VERB().safeParse({
				language: "de",
				canonicalForm: "mitkommen",
				family: "Lexeme",
				kind: "VERB",
				coreFeatures: {
					hasGovPrep: null,
					hasSepPrefix: "mit",
					lexicallyReflexive: null,
					verbType: null,
				},
			}).success,
		).toBe(true);
	});

	it("rejects unsupported inherited features and impossible inflection combinations", () => {
		expect(
			schemasFor.de.entity.Lemma.Lexeme.VERB().safeParse({
				language: "de",
				canonicalForm: "mitkommen",
				family: "Lexeme",
				kind: "VERB",
				coreFeatures: {
					phrasal: "Yes",
				},
			}).success,
		).toBe(false);

		expect(
			schemasFor.de.entity.Lemma.Lexeme.VERB().safeParse({
				language: "de",
				canonicalForm: "sich beeilen",
				family: "Lexeme",
				kind: "VERB",
				coreFeatures: {
					reflex: "Yes",
				},
			}).success,
		).toBe(false);

		expect(
			schemasFor.de.entity.Attestation.Inflection.Lexeme.VERB().safeParse(
				{
					members: [{ attested: "geht", orthography: "Standard" }],
					realizationCoverage: "Full",

					surface: {
						...makeLexemeSurfaceReference("de", "VERB", "gehen"),
						language: "de",
						normalizedSurface: "geht",
						spelling: "Canonical",
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
				},
			).success,
		).toBe(false);

		expect(
			schemasFor.de.entity.Attestation.Inflection.Lexeme.VERB().safeParse(
				{
					members: [{ attested: "geh", orthography: "Standard" }],
					realizationCoverage: "Full",

					surface: {
						...makeLexemeSurfaceReference("de", "VERB", "gehen"),
						language: "de",
						normalizedSurface: "geh",
						spelling: "Canonical",
						surfaceKind: "Inflection",
						inflectionalFeatures: {
							mood: "Imp",
							tense: "Past",
							verbForm: "Fin",
						},
					},
				},
			).success,
		).toBe(false);
	});

	it("keeps the verb registry branch exposed", () => {
		expect(typeof schemasFor.de.entity.Lemma.Lexeme.VERB().parse).toBe(
			"function",
		);
		expect(
			typeof schemasFor.de.entity.Attestation.Inflection.Lexeme.VERB()
				.parse,
		).toBe("function");
	});
});
