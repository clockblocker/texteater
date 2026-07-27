import { type ZodTypeAny, z } from "zod";

type SchemaDescriptor =
	| { readonly kind: "string" }
	| { readonly kind: "number" }
	| { readonly kind: "boolean" }
	| { readonly kind: "null" }
	| { readonly kind: "literal"; readonly value: unknown }
	| { readonly kind: "enum"; readonly values: readonly string[] }
	| { readonly kind: "array"; readonly item: SchemaDescriptor }
	| { readonly kind: "optional"; readonly inner: SchemaDescriptor }
	| { readonly kind: "nullable"; readonly inner: SchemaDescriptor }
	| {
			readonly kind: "object";
			readonly properties: Readonly<Record<string, SchemaDescriptor>>;
	  }
	| { readonly kind: "union"; readonly options: readonly SchemaDescriptor[] };

export function getSchemaDescriptor(schema: ZodTypeAny): SchemaDescriptor {
	if (schema instanceof z.ZodString) {
		return { kind: "string" };
	}

	if (schema instanceof z.ZodNumber) {
		return { kind: "number" };
	}

	if (schema instanceof z.ZodBoolean) {
		return { kind: "boolean" };
	}

	if (schema instanceof z.ZodNull) {
		return { kind: "null" };
	}

	if (schema instanceof z.ZodLiteral) {
		return { kind: "literal", value: schema.value };
	}

	if (schema instanceof z.ZodEnum) {
		return {
			kind: "enum",
			values: [...schema.options],
		};
	}

	if (schema instanceof z.ZodArray) {
		return {
			kind: "array",
			item: getSchemaDescriptor(schema.element),
		};
	}

	if (schema instanceof z.ZodOptional) {
		return {
			kind: "optional",
			inner: getSchemaDescriptor(schema.unwrap()),
		};
	}

	if (schema instanceof z.ZodNullable) {
		return {
			kind: "nullable",
			inner: getSchemaDescriptor(schema.unwrap()),
		};
	}

	if (schema instanceof z.ZodUnion) {
		return {
			kind: "union",
			options: schema.options.map((option: ZodTypeAny) =>
				getSchemaDescriptor(option),
			),
		};
	}

	if (schema instanceof z.ZodObject) {
		const shape = schema.shape;
		const properties = Object.fromEntries(
			Object.keys(shape)
				.sort((left, right) => left.localeCompare(right))
				.map((key) => [key, getSchemaDescriptor(shape[key])]),
		);
		return {
			kind: "object",
			properties,
		};
	}

	throw new Error(
		`Unsupported schema type in prompt infra v0: ${schema._def.typeName}`,
	);
}
