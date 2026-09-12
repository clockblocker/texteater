import { describe, expect, test } from "bun:test";
import { deConstructionFusionFeaturesSchema as OldDeConstructionFusionFeatureBagsSchema } from "../../dumling/src/schemas/concrete-language/features/de/construction/fusion.js";
import { deDeterminerFeaturesSchema as OldDeDeterminerFeatureBagsSchema } from "../../dumling/src/schemas/concrete-language/features/de/lexeme/determiner.js";
import { deVerbFeaturesSchema as OldDeVerbFeatureBagsSchema } from "../../dumling/src/schemas/concrete-language/features/de/lexeme/verb.js";
import { heAdjectiveFeaturesSchema as OldHeAdjectiveFeatureBagsSchema } from "../../dumling/src/schemas/concrete-language/features/he/lexeme/adjective.js";
import { heVerbFeaturesSchema as OldHeVerbFeatureBagsSchema } from "../../dumling/src/schemas/concrete-language/features/he/lexeme/verb.js";
import { DeConstructionFusionFeatureBagsSchema } from "../src/schemas/concrete-language/de/construction/fusion.js";
import { DeDeterminerFeatureBagsSchema } from "../src/schemas/concrete-language/de/lexeme/determiner.js";
import { DeVerbFeatureBagsSchema } from "../src/schemas/concrete-language/de/lexeme/verb.js";
import { HeAdjectiveFeatureBagsSchema } from "../src/schemas/concrete-language/he/lexeme/adjective.js";
import { HeVerbFeatureBagsSchema } from "../src/schemas/concrete-language/he/lexeme/verb.js";

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

	test("Hebrew Lexeme/VERB", () => {
		expectSameAcceptance(
			OldHeVerbFeatureBagsSchema,
			HeVerbFeatureBagsSchema,
			[
				{
					core: { hebBinyan: "PAAL", hebExistential: null },
					inflectional: {
						definite: null,
						gender: ["Fem", "Masc"],
						mood: null,
						number: "Plur",
						person: ["2", "3"],
						polarity: null,
						tense: "Past",
						verbForm: null,
						voice: "Act",
					},
				},
				{
					core: { hebBinyan: null, hebExistential: "Yes" },
					inflectional: {
						definite: null,
						gender: "Masc",
						mood: "Imp",
						number: null,
						person: "2",
						polarity: "Pos",
						tense: null,
						verbForm: null,
						voice: null,
					},
				},
				{
					core: { hebBinyan: null, hebExistential: null },
					inflectional: {
						definite: null,
						gender: null,
						mood: null,
						number: null,
						person: null,
						polarity: null,
						tense: null,
						verbForm: null,
						voice: null,
					},
				},
				{
					core: { hebBinyan: "UNKNOWN", hebExistential: null },
					inflectional: {
						definite: null,
						gender: "Neut",
						mood: null,
						number: null,
						person: [],
						polarity: null,
						tense: null,
						verbForm: null,
						voice: null,
					},
				},
			],
		);
	});

	test("German Lexeme/DET", () => {
		expectSameAcceptance(
			OldDeDeterminerFeatureBagsSchema,
			DeDeterminerFeatureBagsSchema,
			[
				{
					core: {
						definite: "Def",
						extPos: "DET",
						foreign: null,
						numType: "Card",
						person: "3",
						polite: null,
						poss: "Yes",
						pronType: "Art",
					},
					inflectional: {
						case: "Nom",
						degree: null,
						gender: "Masc",
						"gender[psor]": ["Fem", "Masc"],
						number: "Sing",
						"number[psor]": null,
					},
				},
				{
					core: {
						definite: null,
						extPos: null,
						foreign: null,
						numType: null,
						person: null,
						polite: null,
						poss: null,
						pronType: null,
					},
					inflectional: {
						case: null,
						degree: null,
						gender: null,
						"gender[psor]": null,
						number: null,
						"number[psor]": null,
					},
				},
				{
					core: {
						definite: "Cons",
						extPos: "PRON",
						foreign: null,
						numType: null,
						person: null,
						polite: null,
						poss: null,
						pronType: "Rcp",
					},
					inflectional: {
						case: "Loc",
						degree: null,
						gender: null,
						"gender[psor]": [],
						number: null,
						"number[psor]": null,
					},
				},
			],
		);
	});
});
