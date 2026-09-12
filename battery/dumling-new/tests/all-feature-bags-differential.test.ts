import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";

type JsonSchema = {
	anyOf?: JsonSchema[];
	const?: unknown;
	enum?: unknown[];
	items?: JsonSchema;
	properties?: Record<string, JsonSchema>;
	type?: string;
};

function exampleFrom(schema: JsonSchema): unknown {
	if (schema.anyOf) {
		const option =
			schema.anyOf.find((candidate) => candidate.type !== "null") ??
			schema.anyOf[0];
		return option ? exampleFrom(option) : undefined;
	}
	if ("const" in schema) return schema.const;
	if (schema.enum) return schema.enum[0];
	if (schema.type === "array") return [exampleFrom(schema.items ?? {})];
	if (schema.type === "object") {
		return Object.fromEntries(
			Object.entries(schema.properties ?? {}).map(([name, property]) => [
				name,
				exampleFrom(property),
			]),
		);
	}
	if (schema.type === "null") return null;
	if (schema.type === "boolean") return true;
	if (schema.type === "number" || schema.type === "integer") return 0;
	return "value";
}

const packageRoot = path.resolve(import.meta.dir, "..");
const oldRoot = path.resolve(
	packageRoot,
	"../dumling/src/schemas/concrete-language/features",
);
const newRoot = path.resolve(packageRoot, "src/schemas/concrete-language");

const schemaPaths = (
	await readdir(oldRoot, { recursive: true, withFileTypes: true })
)
	.filter(
		(entry) =>
			entry.isFile() &&
			entry.name.endsWith(".ts") &&
			!entry.name.endsWith("-subtree.ts"),
	)
	.map((entry) =>
		path.relative(oldRoot, path.join(entry.parentPath, entry.name)),
	)
	.sort();

describe("all old and new per-Kind Feature Bag schemas", () => {
	for (const schemaPath of schemaPaths) {
		test(schemaPath, async () => {
			const oldModule = await import(
				pathToFileURL(path.join(oldRoot, schemaPath)).href
			);
			const newModule = await import(
				pathToFileURL(path.join(newRoot, schemaPath)).href
			);
			const oldSchema = Object.values(oldModule).find(
				(value) => value instanceof z.ZodObject,
			) as z.ZodType;
			const newSchema = Object.values(newModule).find(
				(value) => value instanceof z.ZodObject,
			) as z.ZodType;
			const validExample = exampleFrom(
				z.toJSONSchema(oldSchema) as unknown as JsonSchema,
			);

			expect(oldSchema.safeParse(validExample).success).toBe(true);
			for (const value of [
				validExample,
				null,
				{},
				{ core: {}, inflectional: {} },
				{ core: { unexpected: true }, inflectional: {} },
				{ ...(validExample as object), unexpected: true },
			]) {
				expect(newSchema.safeParse(value).success).toBe(
					oldSchema.safeParse(value).success,
				);
			}
		});
	}
});
