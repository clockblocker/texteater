import { z } from "zod/v4";

type CanonicalShape<TSchema extends z.ZodObject> = TSchema["shape"];

type SchemaKey<TSchema extends z.ZodObject> = Extract<
	keyof CanonicalShape<TSchema>,
	string
>;

type FixedFieldsFor<TSchema extends z.ZodObject> = Partial<{
	[K in SchemaKey<TSchema>]: z.input<CanonicalShape<TSchema>[K]>;
}>;

type FixedFieldMask<
	TSchema extends z.ZodObject,
	TFixedFields extends Record<string, unknown>,
> = {
	[K in Extract<keyof TFixedFields, SchemaKey<TSchema>>]: true;
};

type NoUnknownFixedFields<TSchema extends z.ZodObject, TFixedFields> = Record<
	Exclude<keyof TFixedFields, SchemaKey<TSchema>>,
	never
>;

type ModelShape<
	TSchema extends z.ZodObject,
	TFixedFields extends Record<string, unknown>,
> = Pick<
	CanonicalShape<TSchema>,
	Exclude<keyof CanonicalShape<TSchema>, keyof TFixedFields>
>;

/**
 * Builds a codec from a minimal object with fixed fields omitted to its
 * canonical object representation.
 *
 * The input schema inherits the canonical object's unknown-key policy. Decode
 * restores the configured fields; encode requires those fields to equal their
 * configured values before removing them.
 */
export function buildFixedFieldsCodec<
	TCanonicalSchema extends z.ZodObject,
	const TFixedFields extends Record<string, unknown>,
>(
	canonicalSchema: TCanonicalSchema,
	fixedFields: TFixedFields &
		NoInfer<FixedFieldsFor<TCanonicalSchema>> &
		NoUnknownFixedFields<TCanonicalSchema, TFixedFields>,
) {
	const fixedFieldEntries = Object.entries(fixedFields);
	const fixedFieldMask = Object.fromEntries(
		fixedFieldEntries.map(([fieldName]) => [fieldName, true]),
	) as FixedFieldMask<TCanonicalSchema, TFixedFields>;
	const modelSchema = canonicalSchema.omit(
		fixedFieldMask as never,
	) as unknown as z.ZodObject<ModelShape<TCanonicalSchema, TFixedFields>>;

	const parsedFixedFields = Object.fromEntries(
		fixedFieldEntries.map(([fieldName, fixedValue]) => {
			const fieldSchema = canonicalSchema.shape[fieldName] as
				| z.ZodType
				| undefined;
			if (!fieldSchema) {
				throw new Error(
					`Cannot fix unknown field "${fieldName}" because it does not exist in the canonical schema.`,
				);
			}
			return [fieldName, fieldSchema.parse(fixedValue)];
		}),
	);

	return z.codec(modelSchema, canonicalSchema, {
		decode: (modelValue) =>
			({
				...modelValue,
				...fixedFields,
			}) as z.input<typeof canonicalSchema>,
		encode: (canonicalValue) => {
			const modelValue = {
				...(canonicalValue as Record<string, unknown>),
			};
			for (const [fieldName, expectedValue] of Object.entries(
				parsedFixedFields,
			)) {
				const receivedValue = modelValue[fieldName];
				if (!deeplyEqual(receivedValue, expectedValue)) {
					throw new Error(
						`Cannot encode canonical object: fixed field "${fieldName}" does not equal ${formatValue(expectedValue)}.`,
					);
				}
				delete modelValue[fieldName];
			}
			return modelValue as z.output<typeof modelSchema>;
		},
	});
}

function deeplyEqual(left: unknown, right: unknown): boolean {
	if (Object.is(left, right)) return true;
	if (left instanceof Date && right instanceof Date) {
		return left.getTime() === right.getTime();
	}
	if (Array.isArray(left) && Array.isArray(right)) {
		return (
			left.length === right.length &&
			left.every((value, index) => deeplyEqual(value, right[index]))
		);
	}
	if (!isRecord(left) || !isRecord(right)) return false;

	const leftKeys = Object.keys(left).sort();
	const rightKeys = Object.keys(right).sort();
	return (
		leftKeys.length === rightKeys.length &&
		leftKeys.every(
			(key, index) =>
				key === rightKeys[index] && deeplyEqual(left[key], right[key]),
		)
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function formatValue(value: unknown): string {
	if (typeof value === "bigint") return `${value}n`;
	try {
		return JSON.stringify(value) ?? String(value);
	} catch {
		return String(value);
	}
}
