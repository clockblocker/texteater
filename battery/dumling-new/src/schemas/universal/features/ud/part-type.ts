import { z } from "zod";

const INF = z.literal("Inf");
const MOD = z.literal("Mod");
const RES = z.literal("Res");
const VBP = z.literal("Vbp");

// Source: https://universaldependencies.org/u/feat/PartType.html
export const PartTypeSchema = z.enum([
	INF.value,
	MOD.value,
	RES.value,
	VBP.value,
]);
export const PartType = PartTypeSchema.enum;
export type PartType = z.infer<typeof PartTypeSchema>;
