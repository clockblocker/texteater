import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/PronType.html
export const PronTypeSchema = z.enum([
	"Art",
	"Dem",
	"Emp",
	"Exc",
	"Ind",
	"Int",
	"Neg",
	"Prs",
	"Rcp",
	"Rel",
	"Tot",
]);
