import { z } from "zod";

const hebBinyanValues = [
	"HIFIL",
	"HITPAEL",
	"HUFAL",
	"NIFAL",
	"PAAL",
	"PIEL",
	"PUAL",
] as const;

// Source: https://universaldependencies.org/treebanks/he_htb/index.html
export const HebBinyan = z.enum(hebBinyanValues);
export type HebBinyan = z.infer<typeof HebBinyan>;
