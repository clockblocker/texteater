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
			schemasFor.he.entity.Selection.Inflection.Lexeme.VERB().safeParse({
				segmentedSentenceId: "test:fixture-sentence" as never,
				clickedSegmentIndex: 0,
				surfaceSegmentIndices: [0],
				attestedSurface: "כתבו",
				selectedOrthography: "Standard",

				surface: {
					...makeLexemeSurfaceReference("he", "VERB", "כתב"),
					language: "he",
					normalizedSurface: "כתבו",
					spelling: "Canonical",
					realizationCoverage: "Full",
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
				segmentedSentenceId: "test:fixture-sentence" as never,
				clickedSegmentIndex: 0,
				surfaceSegmentIndices: [0],
				attestedSurface: "שנתיים",
				selectedOrthography: "Standard",

				surface: {
					...makeLexemeSurfaceReference("he", "NOUN", "שנה"),
					language: "he",
					normalizedSurface: "שנתיים",
					spelling: "Canonical",
					realizationCoverage: "Full",
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
