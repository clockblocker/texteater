import { describe, expect, it } from "bun:test";
import { schemasFor } from "../../src/schema";
import { makeLexemeSurfaceReference } from "../helpers";

describe("Hebrew schema specificity", () => {
	it("accepts Hebrew-specific lexical and inflectional features", () => {
		expect(
			schemasFor.he.entity.Lemma.Lexeme.VERB().safeParse({
				language: "he",
				canonicalForm: "כתב",
				family: "Lexeme",
				kind: "VERB",
				coreFeatures: {
					hebBinyan: "PAAL",
					hebExistential: null,
				},
			}).success,
		).toBe(true);

		expect(
			schemasFor.he.entity.Attestation.Inflection.Lexeme.VERB().safeParse(
				{
					members: [{ attested: "כתבו", orthography: "Standard" }],
					realizationCoverage: "Full",

					surface: {
						...makeLexemeSurfaceReference("he", "VERB", "כתב"),
						language: "he",
						normalizedSurface: "כתבו",
						spelling: "Canonical",
						surfaceKind: "Inflection",
						inflectionalFeatures: {
							definite: null,
							gender: null,
							mood: null,
							number: "Plur",
							person: "3",
							polarity: null,
							tense: "Past",
							verbForm: null,
							voice: null,
						},
					},
				},
			).success,
		).toBe(true);

		expect(
			schemasFor.he.entity.Attestation.Inflection.Lexeme.NOUN().safeParse(
				{
					members: [{ attested: "שנתיים", orthography: "Standard" }],
					realizationCoverage: "Full",

					surface: {
						...makeLexemeSurfaceReference("he", "NOUN", "שנה"),
						language: "he",
						normalizedSurface: "שנתיים",
						spelling: "Canonical",
						surfaceKind: "Inflection",
						inflectionalFeatures: {
							definite: null,
							number: ["Dual", "Plur"],
						},
					},
				},
			).success,
		).toBe(true);
	});

	it("keeps Hebrew aligned with its implemented inventory", () => {
		expect("PART" in schemasFor.he.entity.Lemma.Lexeme).toBe(true);
		expect(
			"PART" in schemasFor.he.entity.Attestation.Inflection.Lexeme,
		).toBe(false);
	});

	it("rejects unsupported Hebrew feature spillover", () => {
		expect(
			schemasFor.he.entity.Lemma.Lexeme.VERB().safeParse({
				language: "he",
				canonicalForm: "כתב",
				family: "Lexeme",
				kind: "VERB",
				coreFeatures: {
					hasSepPrefix: "ab",
				},
			}).success,
		).toBe(false);
	});
});
