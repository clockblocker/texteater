import { z } from "zod";
import type { Codec } from "../../../../../core/types";

const intSchema = z.number().int();
const numberSchema = z.number();

export const intAndNumber = {
	fromInput: (v) => Math.floor(v),
	fromOutput: (v) => v,
	inputSchema: numberSchema,
	outputSchema: intSchema,
} as const satisfies Codec<number, number>;
