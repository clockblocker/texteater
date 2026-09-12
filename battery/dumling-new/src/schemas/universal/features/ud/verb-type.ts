import { z } from "zod";

const AUX = z.literal("Aux");
const COP = z.literal("Cop");
const LIGHT = z.literal("Light");
const MOD = z.literal("Mod");
const QUASI = z.literal("Quasi");

// Source: https://universaldependencies.org/u/feat/VerbType.html
export const VerbTypeSchema = z.enum([
	AUX.value,
	COP.value,
	LIGHT.value,
	MOD.value,
	QUASI.value,
]);
export const VerbType = VerbTypeSchema.enum;
export type VerbType = z.infer<typeof VerbTypeSchema>;
