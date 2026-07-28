import { z } from "zod/v4";
import { toNonNullishWithDefault } from "../../../helpers/casters/to-non-nullish-with-default";
import { toNullable } from "../../../helpers/casters/to-nullable";

const isoDateSchema = z.string().date();
const isoDateTimeSchema = z.string().datetime({ offset: true });
const isoStringSchema = z.union([isoDateSchema, isoDateTimeSchema]);
const dateSchema = z.date();

const nullableDateInputSchema = z.string().nullish();
const nullableDateOutputSchema = dateSchema.nullable();

export const nullableDateAndNullishIsoString = z.codec(
	nullableDateInputSchema,
	nullableDateOutputSchema,
	{
		decode: (value) => {
			if (value == null) {
				return null;
			}

			const parsed = isoStringSchema.safeParse(value);
			return parsed.success ? new Date(parsed.data) : null;
		},
		encode: (value) => (value == null ? null : value.toISOString()),
	},
);

export const nullableDateAndIsoString = nullableDateAndNullishIsoString;

export const isoStringAndDate = z.codec(dateSchema, isoStringSchema, {
	decode: (value) => value.toISOString(),
	encode: (value) => new Date(value),
});

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
