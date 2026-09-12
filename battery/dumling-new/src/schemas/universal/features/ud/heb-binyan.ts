import { z } from "zod";

const HIFIL = z.literal("HIFIL");
const HITPAEL = z.literal("HITPAEL");
const HUFAL = z.literal("HUFAL");
const NIFAL = z.literal("NIFAL");
const PAAL = z.literal("PAAL");
const PIEL = z.literal("PIEL");
const PUAL = z.literal("PUAL");

// Source: https://universaldependencies.org/treebanks/he_htb/index.html
export const HebBinyanSchema = z.enum([
	HIFIL.value,
	HITPAEL.value,
	HUFAL.value,
	NIFAL.value,
	PAAL.value,
	PIEL.value,
	PUAL.value,
]);
export const HebBinyan = HebBinyanSchema.enum;
export type HebBinyan = z.infer<typeof HebBinyanSchema>;
