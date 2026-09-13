import { describe, expect, test } from "bun:test";
import { DeConstructionFusionFeatureBagsSchema } from "../src/schemas/concrete-language/de/construction/fusion.js";
import { DeDeterminerFeatureBagsSchema } from "../src/schemas/concrete-language/de/lexeme/determiner.js";
import { DeVerbFeatureBagsSchema } from "../src/schemas/concrete-language/de/lexeme/verb.js";
import { HeAdjectiveFeatureBagsSchema } from "../src/schemas/concrete-language/he/lexeme/adjective.js";
import { HeVerbFeatureBagsSchema } from "../src/schemas/concrete-language/he/lexeme/verb.js";

import fixtures from "./fixtures/legacy-feature-acceptance.json";

function expectSameAcceptance(
	name: string,
	schema: { safeParse(value: unknown): { success: boolean } },
	values: readonly unknown[],
) {
	const retained = fixtures.focused.find((group) => group.name === name);
	if (!retained) throw new Error(`Missing retained evidence: ${name}`);
	expect(values).toEqual(retained.cases.map((c) => c.input));
	for (const sample of retained.cases)
		expect(schema.safeParse(sample.input).success).toBe(sample.accepted);
}

describe("Feature Bag schemas preserve retained acceptance cases", () => {
	test("German Lexeme/VERB", () => {
		expectSameAcceptance(
			"DeVerbFeatureBagsSchema",
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

	test("German Construction/Fusion omits inapplicable inflectional features", () => {
		expect(
			DeConstructionFusionFeatureBagsSchema.safeParse({ core: {} })
				.success,
		).toBe(true);
		for (const value of [
			{ core: {}, inflectional: {} },
			{ core: {}, inflectional: null },
			{ core: { unexpected: true } },
			{ core: {}, inflectional: { unexpected: true } },
		])
			expect(
				DeConstructionFusionFeatureBagsSchema.safeParse(value).success,
			).toBe(false);
	});

	test("Hebrew Lexeme/ADJ", () => {
		expectSameAcceptance(
			"HeAdjectiveFeatureBagsSchema",
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
			"HeVerbFeatureBagsSchema",
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
			"DeDeterminerFeatureBagsSchema",
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
