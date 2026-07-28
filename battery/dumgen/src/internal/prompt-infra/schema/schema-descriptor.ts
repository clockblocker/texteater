import { type ZodType, z } from "zod";

type SchemaDescriptor =
	| { readonly kind: "string" }
	| { readonly kind: "number" }
	| { readonly kind: "boolean" }
	| { readonly kind: "null" }
	| { readonly kind: "literal"; readonly value: unknown }
	| { readonly kind: "enum"; readonly values: readonly unknown[] }
	| { readonly kind: "array"; readonly item: SchemaDescriptor }
	| { readonly kind: "optional"; readonly inner: SchemaDescriptor }
	| {
			readonly kind: "object";
			readonly properties: Readonly<Record<string, SchemaDescriptor>>;
	  }
	| { readonly kind: "union"; readonly options: readonly SchemaDescriptor[] };

type JsonSchema = Record<string, unknown>;

function isJsonSchema(value: unknown): value is JsonSchema {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalizeJsonSchema(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(canonicalizeJsonSchema);
	}
	if (!isJsonSchema(value)) return value;

	return Object.fromEntries(
		Object.entries(value)
			.filter(([key]) => key !== "$schema")
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, child]) => [key, canonicalizeJsonSchema(child)]),
	);
}

function toDeterministicJsonSchema(schema: ZodType): JsonSchema {
	return canonicalizeJsonSchema(z.toJSONSchema(schema)) as JsonSchema;
}

function describeJsonSchema(schema: JsonSchema): SchemaDescriptor {
	if ("const" in schema) {
		return { kind: "literal", value: schema.const };
	}

	if (Array.isArray(schema.enum)) {
		return { kind: "enum", values: schema.enum };
	}

	if (Array.isArray(schema.anyOf)) {
		return {
			kind: "union",
			options: schema.anyOf.map((option) => {
				if (!isJsonSchema(option)) {
					throw new Error("Invalid anyOf option in prompt schema");
				}
				return describeJsonSchema(option);
			}),
		};
	}

	if (schema.type === "array") {
		if (!isJsonSchema(schema.items)) {
			throw new Error("Array prompt schema must define one item schema");
		}
		return { kind: "array", item: describeJsonSchema(schema.items) };
	}

	if (schema.type === "object") {
		if (!isJsonSchema(schema.properties)) {
			return { kind: "object", properties: {} };
		}

		const required = new Set(
			Array.isArray(schema.required)
				? schema.required.filter(
						(value): value is string => typeof value === "string",
					)
				: [],
		);
		const properties: Record<string, SchemaDescriptor> = Object.fromEntries(
			Object.entries(schema.properties).map(([key, value]) => {
				if (!isJsonSchema(value)) {
					throw new Error(`Invalid property schema for ${key}`);
				}
				const descriptor = describeJsonSchema(value);
				return [
					key,
					required.has(key)
						? descriptor
						: ({ kind: "optional", inner: descriptor } as const),
				];
			}),
		);
		return { kind: "object", properties };
	}

	switch (schema.type) {
		case "string":
		case "number":
		case "integer":
		case "boolean":
		case "null":
			return {
				kind: schema.type === "integer" ? "number" : schema.type,
			};
		default:
			throw new Error("Unsupported JSON Schema in prompt infrastructure");
	}
}

export function getSchemaDescriptor(schema: ZodType): SchemaDescriptor {
	return describeJsonSchema(toDeterministicJsonSchema(schema));
}
