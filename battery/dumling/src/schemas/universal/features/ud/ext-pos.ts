import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/ExtPos.html
export const ExtPosSchema = z.enum([
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
]);
