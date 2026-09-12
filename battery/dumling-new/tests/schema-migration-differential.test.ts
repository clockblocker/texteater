import { describe, expect, test } from "bun:test";
import { deConstructionFusionFeaturesSchema as OldDeConstructionFusionFeatureBagsSchema } from "../../dumling/src/schemas/concrete-language/features/de/construction/fusion.js";
import { deVerbFeaturesSchema as OldDeVerbFeatureBagsSchema } from "../../dumling/src/schemas/concrete-language/features/de/lexeme/verb.js";
import { heAdjectiveFeaturesSchema as OldHeAdjectiveFeatureBagsSchema } from "../../dumling/src/schemas/concrete-language/features/he/lexeme/adjective.js";
import { DeConstructionFusionFeatureBagsSchema } from "../src/schemas/concrete-language/de/construction/fusion.js";
import { DeVerbFeatureBagsSchema } from "../src/schemas/concrete-language/de/lexeme/verb.js";
import { HeAdjectiveFeatureBagsSchema } from "../src/schemas/concrete-language/he/lexeme/adjective.js";

function expectSameAcceptance(
	oldSchema: { safeParse(value: unknown): { success: boolean } },
	newSchema: { safeParse(value: unknown): { success: boolean } },
	values: readonly unknown[],
) {
	for (const value of values) {
		expect(newSchema.safeParse(value).success, JSON.stringify(value)).toBe(
			oldSchema.safeParse(value).success,
		);
	}
}

describe("old and new Feature Bag schemas accept the same values", () => {
	test("German Lexeme/VERB", () => {
		expectSameAcceptance(
			OldDeVerbFeatureBagsSchema,
			DeVerbFeatureBagsSchema,
			[
				{
					core: {
						hasGovPrep: null,
						hasSepPrefix: null,
						lexicallyReflexive: null,
						verbType: null,
					},
					inflectional: {
						number: "Sing",
						tense: null,
						verbForm: null,
						voice: null,
					},
				},
				{
					core: {
						hasGovPrep: "mit",
						hasSepPrefix: "ab",
						lexicallyReflexive: "Yes",
						verbType: "Mod",
					},
					inflectional: {
						mood: "Ind",
						number: "Plur",
						person: "3",
						tense: "Pres",
						verbForm: "Fin",
						voice: null,
					},
				},
				{
					core: {
						hasGovPrep: null,
						hasSepPrefix: null,
						lexicallyReflexive: null,
						verbType: null,
					},
					inflectional: {
						number: null,
						tense: null,
						verbForm: null,
						voice: null,
					},
				},
				{
					core: {
						hasGovPrep: null,
						hasSepPrefix: null,
						lexicallyReflexive: null,
						verbType: "Cop",
					},
					inflectional: {
						number: "Sing",
						tense: null,
						verbForm: null,
						voice: null,
					},
				},
			],
		);
	});

	test("German Construction/Fusion", () => {
		expectSameAcceptance(
			OldDeConstructionFusionFeatureBagsSchema,
			DeConstructionFusionFeatureBagsSchema,
			[
				{ core: {}, inflectional: {} },
				{ core: {} },
				{ core: { unexpected: true }, inflectional: {} },
				{ core: {}, inflectional: { unexpected: true } },
			],
		);
	});

	test("Hebrew Lexeme/ADJ", () => {
		expectSameAcceptance(
			OldHeAdjectiveFeatureBagsSchema,
			HeAdjectiveFeatureBagsSchema,
			[
				{
					core: { abbr: null },
					inflectional: {
						definite: null,
						gender: "Fem",
						number: null,
					},
				},
				{
					core: { abbr: "Yes" },
					inflectional: {
						definite: "Def",
						gender: ["Fem", "Masc"],
						number: "Plur",
					},
				},
				{
					core: { abbr: null },
					inflectional: {
						definite: null,
						gender: null,
						number: null,
					},
				},
				{
					core: { abbr: null },
					inflectional: {
						definite: null,
						gender: [],
						number: null,
					},
				},
				{
					core: { abbr: null },
					inflectional: {
						definite: null,
						gender: ["Neut"],
						number: null,
					},
				},
			],
		);
	});
});
