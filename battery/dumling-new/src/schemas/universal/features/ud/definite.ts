import { z } from "zod";

const COM = z.literal("Com"); // complex
const CONS = z.literal("Cons"); // construct state; reduced definiteness
const DEF = z.literal("Def"); // definite
const IND = z.literal("Ind"); // indefinite
const SPEC = z.literal("Spec"); // specific indefinite

// Source: https://universaldependencies.org/u/feat/Definite.html
export const DefiniteSchema = z.enum([
	COM.value,
	CONS.value,
	DEF.value,
	IND.value,
	SPEC.value,
]);
export const Definite = DefiniteSchema.enum;
export type Definite = z.infer<typeof DefiniteSchema>;
