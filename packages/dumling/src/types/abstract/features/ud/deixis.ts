import { z } from "zod/v3";

const deixisValues = [
	"Abv",
	"Bel",
	"Even",
	"Med",
	"Nvis",
	"Prox",
	"Remt",
] as const;

// Source: https://universaldependencies.org/u/feat/Deixis.html
export const Deixis = z.enum(deixisValues);
export type Deixis = z.infer<typeof Deixis>;
