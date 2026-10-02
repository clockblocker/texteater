import { z } from "zod";

export const PosSchema = z.enum([
	"ADJ",
	"ADV",
	"INTJ",
	"NOUN",
	"PROPN",
	"VERB",
	"ADP",
	"AUX",
	"CCONJ",
	"DET",
	"NUM",
	"PART",
	"PRON",
	"SCONJ",
	"PUNCT",
	"SYM",
]);
