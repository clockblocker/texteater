const extPosValues = [
	"ADJ",
	"ADP",
	"ADV",
	"AUX",
	"CCONJ",
	"DET",
	"INTJ",
	"PRON",
	"PROPN",
	"SCONJ",
] as const;

// Source: https://universaldependencies.org/u/feat/ExtPos.html
export const ExtPos = extPosValues;
export type ExtPos = (typeof ExtPos)[number];
