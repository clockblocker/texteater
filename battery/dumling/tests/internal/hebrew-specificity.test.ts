import { describe, expect, it } from "bun:test";
import { schemasFor } from "../../src/schema";
import { makeLexemeSurfaceReference } from "../helpers";

describe("Hebrew schema specificity", () => {
	it("accepts Hebrew-specific lexical and inflectional features", () => {
		expect(
			schemasFor.he.entity.Lemma.Lexeme.VERB().safeParse({
				language: "he",
				canonicalLemma: "כתב",
				lemmaKind: "Lexeme",
				lemmaSubKind: "VERB",
				inherentFeatures: {
					hebBinyan: "PAAL",
					hebExistential: null,
				},
				meaningInEmojis: "✍️",
			}).success,
		).toBe(true);

		expect(
			schemasFor.he.entity.Selection.Inflection.Lexeme.VERB().safeParse({
				language: "he",
				selectionFeatures: null,
				spelledSelection: "כתבו",

				surface: {
					...makeLexemeSurfaceReference("he", "VERB", "כתב"),
					language: "he",
					normalizedFullSurface: "כתבו",
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
			}).success,
		).toBe(true);

		expect(
			schemasFor.he.entity.Selection.Inflection.Lexeme.NOUN().safeParse({
				language: "he",
				selectionFeatures: null,
				spelledSelection: "שנתיים",

				surface: {
					...makeLexemeSurfaceReference("he", "NOUN", "שנה"),
					language: "he",
					normalizedFullSurface: "שנתיים",
					surfaceKind: "Inflection",
					inflectionalFeatures: {
						definite: null,
						number: ["Dual", "Plur"],
					},
				},
			}).success,
		).toBe(true);
	});

	it("keeps Hebrew aligned with its implemented inventory", () => {
		expect("PART" in schemasFor.he.entity.Lemma.Lexeme).toBe(true);
		expect("PART" in schemasFor.he.entity.Selection.Inflection.Lexeme).toBe(
			false,
		);
	});

	it("rejects unsupported Hebrew feature spillover", () => {
		expect(
			schemasFor.he.entity.Lemma.Lexeme.VERB().safeParse({
				language: "he",
				canonicalLemma: "כתב",
				lemmaKind: "Lexeme",
				lemmaSubKind: "VERB",
				inherentFeatures: {
					hasSepPrefix: "ab",
				},
				meaningInEmojis: "✍️",
			}).success,
		).toBe(false);
	});
});
