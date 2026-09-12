import { z } from "zod";

const ABV = z.literal("Abv");
const BEL = z.literal("Bel");
const EVEN = z.literal("Even");
const MED = z.literal("Med");
const NVIS = z.literal("Nvis");
const PROX = z.literal("Prox");
const REMT = z.literal("Remt");

// Source: https://universaldependencies.org/u/feat/Deixis.html
export const DeixisSchema = z.enum([
	ABV.value,
	BEL.value,
	EVEN.value,
	MED.value,
	NVIS.value,
	PROX.value,
	REMT.value,
]);
export const Deixis = DeixisSchema.enum;
export type Deixis = z.infer<typeof DeixisSchema>;
