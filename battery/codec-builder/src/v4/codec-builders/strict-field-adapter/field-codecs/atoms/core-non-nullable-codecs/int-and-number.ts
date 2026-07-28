import { z } from "zod/v4";

const intSchema = z.number().int();
const numberSchema = z.number();

export const intAndNumber = z.codec(numberSchema, intSchema, {
	decode: Math.floor,
	encode: (value) => value,
});
