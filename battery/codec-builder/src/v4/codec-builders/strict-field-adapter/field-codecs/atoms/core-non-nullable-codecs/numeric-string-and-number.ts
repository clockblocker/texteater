import { z } from "zod/v4";

const numericStringSchema = z
	.string()
	.refine((v) => v.trim() !== "" && !Number.isNaN(Number(v)), {
		message: "Expected a numeric string",
	});

const numberSchema = z.number();

export const numericStringAndNumber = z.codec(
	numberSchema,
	numericStringSchema,
	{
		decode: String,
		encode: Number,
	},
);
