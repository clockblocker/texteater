import { type ZodType, z } from "zod";

type JsonSchema = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonSchema(value: unknown): value is JsonSchema {
	return isRecord(value);
}

function acceptsNull(schema: JsonSchema): boolean {
	if (schema.type === "null") return true;
	return (
		Array.isArray(schema.anyOf) &&
		schema.anyOf.some(
			(option) => isJsonSchema(option) && acceptsNull(option),
		)
	);
}

function compatibilityScore(schema: JsonSchema, value: unknown): number {
	if ("const" in schema) {
		return value === schema.const ? 0 : Number.POSITIVE_INFINITY;
	}

	if (Array.isArray(schema.anyOf)) {
		return Math.min(
			...schema.anyOf.map((option) =>
				isJsonSchema(option)
					? compatibilityScore(option, value)
					: Number.POSITIVE_INFINITY,
			),
		);
	}

	if (schema.type === "object" && isRecord(value)) {
		const properties = isRecord(schema.properties) ? schema.properties : {};
		const required = new Set(
			Array.isArray(schema.required)
				? schema.required.filter(
						(name): name is string => typeof name === "string",
					)
				: [],
		);
		let score = 0;
		for (const [name, propertySchema] of Object.entries(properties)) {
			if (!isJsonSchema(propertySchema)) continue;
			if (name in value) {
				score += compatibilityScore(propertySchema, value[name]);
			} else if (required.has(name) && !acceptsNull(propertySchema)) {
				score += 1;
			}
		}
		return score;
	}

	return 0;
}

function canonicalize(schema: JsonSchema, value: unknown): unknown {
	if (Array.isArray(schema.anyOf)) {
		const candidates = schema.anyOf.filter(isJsonSchema);
		const selected = candidates.reduce<JsonSchema | undefined>(
			(best, candidate) =>
				best === undefined ||
				compatibilityScore(candidate, value) <
					compatibilityScore(best, value)
					? candidate
					: best,
			undefined,
		);
		return selected ? canonicalize(selected, value) : value;
	}

	if (schema.type === "array" && Array.isArray(value)) {
		return isJsonSchema(schema.items)
			? value.map((entry) =>
					canonicalize(schema.items as JsonSchema, entry),
				)
			: value;
	}

	if (schema.type !== "object" || !isRecord(value)) return value;

	const properties = isRecord(schema.properties) ? schema.properties : {};
	const required = new Set(
		Array.isArray(schema.required)
			? schema.required.filter(
					(name): name is string => typeof name === "string",
				)
			: [],
	);
	const result = { ...value };
	for (const [name, propertySchema] of Object.entries(properties)) {
		if (!isJsonSchema(propertySchema)) continue;
		if (
			name in result &&
			!(result[name] === undefined && acceptsNull(propertySchema))
		) {
			result[name] = canonicalize(propertySchema, result[name]);
		} else if (required.has(name) && acceptsNull(propertySchema)) {
			result[name] = null;
		}
	}
	return result;
}

export function canonicalizeNullableProperties(
	schema: ZodType,
	value: unknown,
): unknown {
	return canonicalize(z.toJSONSchema(schema) as JsonSchema, value);
}
