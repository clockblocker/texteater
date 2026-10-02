import { z } from "zod";

// Source: https://universaldependencies.org/treebanks/he_htb/index.html
export const HebBinyanSchema = z.enum([
	"HIFIL",
	"HITPAEL",
	"HUFAL",
	"NIFAL",
	"PAAL",
	"PIEL",
	"PUAL",
]);
