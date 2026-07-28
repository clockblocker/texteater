import { z } from "zod";
import type { SchemaCodec } from "../../../../../core/types";
import { toNonNullishWithDefault } from "../../../helpers/casters/to-non-nullish-with-default";
import { toNullable } from "../../../helpers/casters/to-nullable";

const isoDateSchema = z.string().date();
const isoDateTimeSchema = z.string().datetime({ offset: true });
const isoStringSchema = z.union([isoDateSchema, isoDateTimeSchema]);
const dateSchema = z.date();

const nullableDateInputSchema = isoStringSchema.nullish();
const nullableDateOutputSchema = dateSchema.nullable();

export const nullableDateAndNullishIsoString = {
	fromInput: (value) => {
		if (value == null) {
			return null;
		}

		const parsed = isoStringSchema.safeParse(value);
		if (!parsed.success) {
			return null;
		}

		const date = new Date(parsed.data);
		return Number.isNaN(date.getTime()) ? null : date;
	},
	fromOutput: (value) => (value == null ? null : value.toISOString()),
	inputSchema: nullableDateInputSchema,
	outputSchema: nullableDateOutputSchema,
} as const satisfies SchemaCodec<
	typeof nullableDateInputSchema,
	typeof nullableDateOutputSchema
>;

export const nullableDateAndIsoString = nullableDateAndNullishIsoString;

export const isoStringAndDate = {
	fromInput: (value: Date) => value.toISOString(),
	fromOutput: (value: string) => new Date(value),
	inputSchema: dateSchema,
	outputSchema: isoStringSchema,
} as const satisfies SchemaCodec<typeof dateSchema, typeof isoStringSchema>;

export const dateAndNullishIsoString = toNonNullishWithDefault(
	nullableDateAndNullishIsoString,
	new Date(),
);

export const nullableIsoStringAndNullishDate = toNullable(isoStringAndDate);
export const nullableIsoStringAndDate = nullableIsoStringAndNullishDate;

export const isoStringAndNullishDate = toNonNullishWithDefault(
	nullableIsoStringAndNullishDate,
	new Date().toISOString(),
);
