import { z } from "zod/v3";

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
export const ExtPos = z.enum(extPosValues);
export type ExtPos = z.infer<typeof ExtPos>;
