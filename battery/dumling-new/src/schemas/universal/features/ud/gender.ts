import { z } from "zod";

const COM = z.literal("Com");
const FEM = z.literal("Fem");
const MASC = z.literal("Masc");
const NEUT = z.literal("Neut");

// Source: https://universaldependencies.org/u/feat/Gender.html
export const GenderSchema = z.enum([
	COM.value,
	FEM.value,
	MASC.value,
	NEUT.value,
]);
export const Gender = GenderSchema.enum;
export type Gender = z.infer<typeof GenderSchema>;
