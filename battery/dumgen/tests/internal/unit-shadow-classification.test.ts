import { describe, expect, test } from "bun:test";
import { supportedLanguages } from "dumling";
import { schemasFor } from "dumling/schema";
import { zodTextFormat } from "openai/helpers/zod";

import { PROMPT_CATALOG } from "../../src/catalog/prompt-catalog";
import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import { unitShadowClassificationExperiment } from "../../src/promptsmith/laboratory/experiments/unit-shadow-classification/evaluation-suite";
import { evaluateUnitShadowClassification } from "../../src/promptsmith/laboratory/experiments/unit-shadow-classification/evaluator";
import { corpus } from "../../src/promptsmith/production/unit-shadow-classification/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/production/unit-shadow-classification/prompt-source";
import {
	inputSchema,
	outputSchema,
	UNIT_SHADOW_CLASSIFICATION_FAMILIES,
	UNIT_SHADOW_CLASSIFICATION_ROUTES,
} from "../../src/promptsmith/production/unit-shadow-classification/schemas";
import { assertSupportedUnitShadowClassification } from "../../src/schema/unit-shadow-classification";

describe("Unit Shadow Family and Kind classification", () => {
	test("owns a large adversarial, multilingual, demonstration-disjoint evaluation", () => {
		expect(corpus.all().ids.length).toBe(60);
		expect(demonstrations.ids.length).toBe(12);
		expect(unitShadowClassificationExperiment.evaluation.ids.length).toBe(
			48,
		);
		expect(
			demonstrations.isDisjointFrom(
				unitShadowClassificationExperiment.evaluation,
			),
		).toBe(true);

		const languages = new Set(
			unitShadowClassificationExperiment.evaluation.cases.map(
				({ input }) => input.language,
			),
		);
		expect(languages).toEqual(new Set(["de", "en", "he"]));

		const resolvedRoutes = new Set(
			unitShadowClassificationExperiment.evaluation.cases.flatMap(
				({ idealOutput }) =>
					idealOutput.target === null
						? []
						: [
								`${idealOutput.target.family}/${idealOutput.target.kind}`,
							],
			),
		);
		for (const family of [
			"Lexeme",
			"Phraseme",
			"Morpheme",
			"Construction",
		]) {
			expect(
				[...resolvedRoutes].some((route) =>
					route.startsWith(`${family}/`),
				),
			).toBe(true);
		}
		expect(
			unitShadowClassificationExperiment.evaluation.cases.filter(
				({ idealOutput }) => idealOutput.decision === "Unresolved",
			).length,
		).toBeGreaterThanOrEqual(10);
	});

	test("pairs a lexical synonym with its phrase counterpart in evaluation", () => {
		const word = corpus.cases["unit-shadow-de-lexical-synonym-word"];
		const phrase = corpus.cases["unit-shadow-de-lexical-synonym-phrase"];
		expect(word?.input.canonicalForm).toBe("erwägen");
		expect(word?.idealOutput.target).toEqual({
			family: "Lexeme",
			kind: "VERB",
		});
		expect(phrase?.input.canonicalForm).toBe("in Betracht ziehen");
		expect(phrase?.idealOutput.target).toEqual({
			family: "Phraseme",
			kind: "Collocation",
		});
		expect(word?.contaminationKeys).toEqual(phrase?.contaminationKeys);
		expect(
			unitShadowClassificationExperiment.evaluation.has(
				"unit-shadow-de-lexical-synonym-word",
			),
		).toBe(true);
		expect(
			unitShadowClassificationExperiment.evaluation.has(
				"unit-shadow-de-lexical-synonym-phrase",
			),
		).toBe(true);
	});

	test("derives every model route from Dumling's language descriptors", () => {
		const expected = new Map<string, string[]>();
		for (const language of supportedLanguages) {
			const registry = schemasFor[language].descriptor
				.Lemma as unknown as Record<string, Record<string, unknown>>;
			for (const [family, kinds] of Object.entries(registry)) {
				const values = expected.get(family) ?? [];
				for (const kind of Object.keys(kinds)) {
					if (!values.includes(kind)) values.push(kind);
				}
				expected.set(family, values);
			}
		}

		expect([...UNIT_SHADOW_CLASSIFICATION_FAMILIES]).toEqual([
			...expected.keys(),
		]);
		for (const [family, kinds] of expected) {
			const routes = UNIT_SHADOW_CLASSIFICATION_ROUTES[family];
			expect(routes).toBeDefined();
			expect([...(routes ?? [])]).toEqual(kinds);
		}
		expect(
			outputSchema.safeParse({
				decision: "Resolved",
				target: { family: "Lexeme", kind: "Prefix" },
			}).success,
		).toBe(false);
	});

	test("has strict shallow schemas and no full-resolution output fields", () => {
		expect(
			inputSchema.safeParse({
				language: "en",
				canonicalForm: "record",
				intendedUse: "A stored account.",
			}).success,
		).toBe(true);
		expect(
			outputSchema.safeParse({
				decision: "Resolved",
				target: { family: "Lexeme", kind: "NOUN" },
			}).success,
		).toBe(true);
		expect(
			outputSchema.safeParse({
				decision: "Resolved",
				target: {
					family: "Lexeme",
					kind: "NOUN",
					coreFeatures: {},
				},
			}).success,
		).toBe(false);
		expect(
			outputSchema.safeParse({
				decision: "Resolved",
				target: null,
			}).success,
		).toBe(false);
		expect(() =>
			zodTextFormat(outputSchema, "unit_shadow_test"),
		).not.toThrow();
	});

	test("validates the selected route against the input language", () => {
		expect(() =>
			assertSupportedUnitShadowClassification(
				{
					language: "de",
					canonicalForm: "eine Entscheidung treffen",
					intendedUse: "A conventional support-verb expression.",
				},
				{
					decision: "Resolved",
					target: { family: "Phraseme", kind: "Collocation" },
				},
			),
		).not.toThrow();
		expect(() =>
			assertSupportedUnitShadowClassification(
				{
					language: "en",
					canonicalForm: "make a decision",
					intendedUse: "A conventional support-verb expression.",
				},
				{
					decision: "Resolved",
					target: { family: "Phraseme", kind: "Collocation" },
				},
			),
		).toThrow(/not a supported Dumling Lemma route/);
	});

	test("uses exact decision, Family, and Kind scoring", () => {
		const args = {
			caseId: "example",
			input: {
				language: "en" as const,
				canonicalForm: "record",
				intendedUse: "A stored account.",
			},
			idealOutput: {
				decision: "Resolved" as const,
				target: { family: "Lexeme" as const, kind: "NOUN" as const },
			},
		};
		expect(
			evaluateUnitShadowClassification({
				...args,
				output: args.idealOutput,
			}),
		).toEqual({
			contractPass: true,
			decisionPass: true,
			familyPass: true,
			kindPass: true,
		});
		expect(
			evaluateUnitShadowClassification({
				...args,
				output: {
					decision: "Resolved",
					target: { family: "Lexeme", kind: "VERB" },
				},
			}),
		).toMatchObject({ contractPass: false, kindPass: false });
	});

	test("registers the generated production prompt with runtime postconditions", () => {
		const prompt =
			PROMPT_CATALOG.laboratory.unitShadowClassification.prompt;
		expect(prompt.systemPrompt).toBe(assembleSystemPrompt(promptSource));
		expect(prompt.inputSchema).toBe(inputSchema);
		expect(prompt.outputSchema).toBe(outputSchema);
		expect(prompt.generationParams.maxOutputTokens).toBe(128);
		expect(prompt.systemPrompt).toContain(
			"not Lemma Resolution or Reading Resolution",
		);
	});
});
