import { expect, test } from "bun:test";
import { z } from "zod";
import { loadRoutes } from "../codegen/routes.js";
import {
	lemmaSchema,
	surfaceSchema,
} from "../src/generated/schemas/de/lexeme/noun.js";
import { surfaceSchema as prefixSchema } from "../src/generated/schemas/de/morpheme/prefix.js";
import { surfaceSchema as hebrewAdjectiveSchema } from "../src/generated/schemas/he/lexeme/adjective.js";
import { surfaceSchema as hebrewNounSchema } from "../src/generated/schemas/he/lexeme/noun.js";
import { unitFixtures } from "./unit-fixtures.js";

test("concrete entrypoints expose canonical schemas for all 396 unit routes", async () => {
	const names = {
		Lemma: "lemmaSchema",
		Surface: "surfaceSchema",
		Reading: "readingSchema",
		Attestation: "attestationSchema",
	} as const;
	for (const route of await loadRoutes()) {
		const fixtures = unitFixtures(route, z);
		const schemas: Record<string, z.ZodType> = await import(
			new URL(
				`../src/generated/schemas/${route.modulePath}`,
				import.meta.url,
			).href
		);
		expect(Object.keys(schemas).sort()).toEqual(
			Object.values(names).sort(),
		);
		for (const unitKind of [
			"Lemma",
			"Surface",
			"Reading",
			"Attestation",
		] as const) {
			const schema = schemas[names[unitKind]];
			if (!schema)
				throw Error(`Missing ${unitKind} schema at ${route.key}`);
			expect<unknown>(schema.parse(fixtures[unitKind])).toEqual(
				route.schemas[unitKind].parse(fixtures[unitKind]),
			);
			expect(schema.safeParse(null).success).toBe(false);
		}
	}
});

test("concrete schemas retain object composition and nested refinements", () => {
	const model = lemmaSchema.omit({
		unitKind: true,
		language: true,
		family: true,
		kind: true,
	});
	expect(
		model.parse({
			canonicalForm: " Cafe\u0301 ",
			coreFeatures: { gender: "Masc", hyph: null },
		}).canonicalForm,
	).toBe("Café");
	expect(
		lemmaSchema.shape.coreFeatures.safeParse({ gender: "Com", hyph: null })
			.success,
	).toBe(false);
	expect(
		surfaceSchema.shape.inflectionalFeatures.safeParse({
			case: null,
			number: null,
		}).success,
	).toBe(false);
	expect(
		surfaceSchema.shape.inflectionalFeatures.safeParse(null).success,
	).toBe(true);
	expect(Object.hasOwn(prefixSchema.shape, "inflectionalFeatures")).toBe(
		false,
	);
	expect(
		prefixSchema.extend({ note: z.string() }).shape.note.parse("note"),
	).toBe("note");
});

test("Hebrew nouns explicitly represent singular indefinite evidence without widening other routes", () => {
	expect(
		hebrewNounSchema.shape.inflectionalFeatures.safeParse({
			number: "Sing",
			definite: "Ind",
		}).success,
	).toBe(true);
	expect(
		hebrewNounSchema.shape.inflectionalFeatures.safeParse({
			number: null,
			definite: null,
		}).success,
	).toBe(false);
	expect(
		hebrewAdjectiveSchema.shape.inflectionalFeatures.safeParse({
			gender: "Masc",
			number: "Sing",
			definite: "Ind",
		}).success,
	).toBe(false);
});
