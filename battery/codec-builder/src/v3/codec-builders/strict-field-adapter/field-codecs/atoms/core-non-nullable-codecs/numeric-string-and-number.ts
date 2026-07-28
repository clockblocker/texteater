import { z } from "zod/v3";
import type { Codec } from "../../../../../core/types";

const numericStringSchema = z
	.string()
	.refine((v) => v.trim() !== "" && !Number.isNaN(Number(v)), {
		message: "Expected a numeric string",
	});

const numberSchema = z.number();

export const numericStringAndNumber = {
	fromInput: (v) => String(v),
	fromOutput: (v) => Number(v),
	inputSchema: numberSchema,
	outputSchema: numericStringSchema,
} as const satisfies Codec<string, number>;
