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
export const HebBinyan = hebBinyanValues;
export type HebBinyan = (typeof HebBinyan)[number];
