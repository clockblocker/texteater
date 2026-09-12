import { z } from "zod";

const COMP = z.literal("Comp");
const OPER = z.literal("Oper");

// Source: https://universaldependencies.org/hy/feat/ConjType.html
export const ConjTypeSchema = z.enum([COMP.value, OPER.value]);
export const ConjType = ConjTypeSchema.enum;
export type ConjType = z.infer<typeof ConjTypeSchema>;
