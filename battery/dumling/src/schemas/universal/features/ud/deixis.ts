import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Deixis.html
export const DeixisSchema = z.enum([
	"Abv",
	"Bel",
	"Even",
	"Med",
	"Nvis",
	"Prox",
	"Remt",
]);
