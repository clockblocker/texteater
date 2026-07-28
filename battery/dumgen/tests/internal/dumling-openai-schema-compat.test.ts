import { describe, expect, test } from "bun:test";
import { schemasFor } from "dumling/schema";
import { zodTextFormat } from "openai/helpers/zod";
import { type ZodType, z } from "zod";

type ConcreteSchemaCase = {
	readonly name: string;
	readonly schema: ZodType;
};

function collectConcreteSchemas(): ConcreteSchemaCase[] {
	const cases: ConcreteSchemaCase[] = [];

	function visit(value: unknown, path: readonly string[]) {
		if (typeof value === "function") {
			cases.push({
				name: path.join("_"),
				schema: value() as ZodType,
			});
			return;
		}

		if (typeof value === "object" && value !== null) {
			for (const [name, child] of Object.entries(value)) {
				visit(child, [...path, name]);
			}
		}
	}

	for (const [language, catalog] of Object.entries(schemasFor)) {
		visit(catalog.entity, [language, "entity"]);
	}

	return cases;
}

function expectEveryObjectPropertyRequired(schema: unknown) {
	if (Array.isArray(schema)) {
		for (const item of schema) expectEveryObjectPropertyRequired(item);
		return;
	}

	if (typeof schema !== "object" || schema === null) return;

	const node = schema as Record<string, unknown>;
	if (
		node.type === "object" &&
		typeof node.properties === "object" &&
		node.properties !== null
	) {
		const propertyNames = Object.keys(node.properties);
		if (propertyNames.length > 0) {
			expect(node.required).toEqual(propertyNames);
		}
	}

	for (const value of Object.values(node)) {
		expectEveryObjectPropertyRequired(value);
	}
}

const concreteSchemaCases = collectConcreteSchemas();

describe("Dumling OpenAI schema compatibility", () => {
	test.each(concreteSchemaCases)(
		"$name is accepted by openai@7 zodTextFormat",
		({ name, schema }) => {
			const format = zodTextFormat(schema, name);

			expect(format.schema.type).toBe("object");
			expectEveryObjectPropertyRequired(format.schema);
		},
	);

	test("nullable and not-applicable properties are required and null-capable", () => {
		const schema = schemasFor.de.entity.Surface.Inflection.Lexeme.VERB();
		const jsonSchema = z.toJSONSchema(schema) as unknown as {
			properties: {
				inflectionalFeatures: {
					anyOf: Array<{
						properties?: Record<
							string,
							{
								type?: string;
								anyOf?: Array<{ type?: string }>;
							}
						>;
						required?: string[];
					}>;
				};
			};
		};
		const firstAlternative =
			jsonSchema.properties.inflectionalFeatures.anyOf[0];
		expect(firstAlternative?.required).toEqual([
			"number",
			"tense",
			"verbForm",
			"voice",
		]);
		expect(firstAlternative?.properties?.number?.anyOf).toContainEqual({
			type: "null",
		});
		expect(firstAlternative?.properties?.verbForm).toEqual({
			type: "null",
		});
	});

	test("normalization still runs on canonical-null OpenAI output", () => {
		const schema =
			schemasFor.en.entity.Selection.Citation.Morpheme.Circumfix();
		zodTextFormat(schema, "dumling_selection");

		const parsed = schema.parse({
			language: "en",
			selectionFeatures: null,
			spelledSelection: "e\u0301",
			surface: {
				language: "en",
				normalizedFullSurface: "CIRCUMFIX",
				surfaceFeatures: null,
				surfaceKind: "Citation",
				lemma: {
					language: "en",
					canonicalLemma: "CIRCUMFIX",
					inherentFeatures: {},
					lemmaKind: "Morpheme",
					lemmaSubKind: "Circumfix",
					meaningInEmojis: "⭕",
				},
			},
		});

		expect(parsed.selectionFeatures).toBeNull();
		expect(parsed.surface.surfaceFeatures).toBeNull();
		expect(parsed.spelledSelection).toBe("é");
		expect(parsed.surface.normalizedFullSurface).toBe("circumfix");
		expect(parsed.surface.lemma.canonicalLemma).toBe("circumfix");
	});
});
