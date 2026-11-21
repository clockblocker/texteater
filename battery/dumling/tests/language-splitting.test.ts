import { describe, expect, test } from "bun:test";
import {
	type CompiledValidationRegistry,
	hasRoot,
	ParsingError,
	parseCompiledValidation,
} from "common-utils/validation";
import { z } from "zod";
import { loadRoutes } from "../codegen/routes.js";
import { validationRegistry as deValidationRegistry } from "../src/generated/languages/de/linked-validation.js";
import { encodedValidation as deEncodedValidation } from "../src/generated/languages/de/validation.js";
import { validationRegistry as enValidationRegistry } from "../src/generated/languages/en/linked-validation.js";
import { encodedValidation as enEncodedValidation } from "../src/generated/languages/en/validation.js";
import { validationRegistry as heValidationRegistry } from "../src/generated/languages/he/linked-validation.js";
import { encodedValidation as heEncodedValidation } from "../src/generated/languages/he/validation.js";
import { validationRegistry as combinedValidationRegistry } from "../src/generated/linked-validation.js";
import { encodedValidation as combinedEncodedValidation } from "../src/generated/validation.js";
import { canonicalFormKey, foldCase, parseUnit } from "../src/index.js";
import { routePolicy } from "../src/schemas/route-policy.js";
import { UnitKindSchema } from "../src/schemas/unit-parts.js";
import type { Language } from "../src/types.js";
import { languageNormalizations } from "../src/validation/languages/normalizations.js";
import { validationOperations } from "../src/validation/operations.js";
import { unitFixtures } from "./unit-fixtures.js";

const routes = await loadRoutes();

const languageEncoded = {
	de: deEncodedValidation,
	en: enEncodedValidation,
	he: heEncodedValidation,
} as const satisfies Record<Language, string>;

function verifyLanguageRegistry<R extends string>(
	language: Language,
	registry: CompiledValidationRegistry<R>,
) {
	const rootNames = Object.keys(registry.roots);
	const expectedRoutes = routes.filter(
		(route) => route.language === language,
	);
	expect(rootNames).toHaveLength(
		expectedRoutes.length * UnitKindSchema.options.length,
	);
	expect(rootNames.every((name) => name.includes(`/${language}/`))).toBe(
		true,
	);

	for (const route of expectedRoutes) {
		const fixtures = unitFixtures(route, z);
		for (const kind of UnitKindSchema.options) {
			const key = `${kind}/${route.key}`;
			expect(hasRoot(registry, key)).toBe(true);
			if (!hasRoot(registry, key)) continue;
			const perLanguageResult = parseCompiledValidation(
				registry,
				key,
				fixtures[kind],
				validationOperations,
			);
			const combinedResult = parseUnit(fixtures[kind]);
			expect(perLanguageResult instanceof ParsingError).toBe(false);
			expect(combinedResult.success).toBe(true);
			if (combinedResult.success) {
				expect<unknown>(perLanguageResult).toEqual(
					combinedResult.chain.value,
				);
			}
		}
	}
}

describe("per-language generated validation splitting", () => {
	test("each per-language linked registry contains only its language's roots and matches parseUnit", () => {
		verifyLanguageRegistry("de", deValidationRegistry);
		verifyLanguageRegistry("en", enValidationRegistry);
		verifyLanguageRegistry("he", heValidationRegistry);
	});

	test("composed validation artifact merges all per-language roots and preserves the linked fingerprint", () => {
		const combined = JSON.parse(combinedEncodedValidation) as {
			roots: Record<string, unknown>;
			definitions: Record<string, unknown>;
		};
		const perLanguageRoots = (["de", "en", "he"] as const).flatMap(
			(language) => {
				const parsed = JSON.parse(languageEncoded[language]) as {
					roots: Record<string, unknown>;
				};
				const keys = Object.keys(parsed.roots);
				expect(
					keys.every((name) => name.includes(`/${language}/`)),
				).toBe(true);
				return keys;
			},
		);
		expect(Object.keys(combined.roots).toSorted()).toEqual(
			perLanguageRoots.toSorted(),
		);
		expect(
			Object.keys(combinedValidationRegistry.roots).toSorted(),
		).toEqual(perLanguageRoots.toSorted());
	});
});

describe("per-language normalization hooks", () => {
	test("foldCase and canonicalFormKey delegate to languageNormalizations", () => {
		for (const [language, sample] of [
			["de", " Um ... WILLEN "],
			["en", "  Cafe\u0301 ... Bar "],
			["he", "  שלום ... עולם "],
		] as const) {
			expect(foldCase(sample, language)).toBe(
				languageNormalizations[language].foldCase(sample),
			);
			expect(canonicalFormKey(sample, language)).toBe(
				languageNormalizations[language].canonicalFormKey(sample),
			);
		}
	});
});

describe("generic routePolicy attestationEvidence", () => {
	test("accepts arbitrary evidence field names without editing core schema files", () => {
		const extended = routePolicy("en", {
			conditions: {
				nounRoute: ["en/Lexeme/NOUN"],
			},
			surfaceChecks: [],
			attestationChecks: [],
			attestationEvidence: {
				customClassifierEvidence: {
					nounRoute: z.string().optional(),
				},
			},
		});
		expect(extended.language).toBe("en");
		expect(
			Object.keys(extended.attestationEvidence.customClassifierEvidence),
		).toEqual(["nounRoute"]);
	});
});
