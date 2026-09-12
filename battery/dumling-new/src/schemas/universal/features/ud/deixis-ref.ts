import { z } from "zod";

const VALUE_1 = z.literal("1"); // relative to the first person participant; speaker
const VALUE_2 = z.literal("2"); // relative to the second person participant; hearer

// Source: https://universaldependencies.org/u/feat/DeixisRef.html
export const DeixisRefSchema = z.enum([VALUE_1.value, VALUE_2.value]);
export const DeixisRef = DeixisRefSchema.enum;
export type DeixisRef = z.infer<typeof DeixisRefSchema>;
