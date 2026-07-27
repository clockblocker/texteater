import { z } from "zod/v3";

const pronTypeValues = [
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
] as const;

// Source: https://universaldependencies.org/u/feat/PronType.html
export const PronType = z.enum(pronTypeValues);
export type PronType = z.infer<typeof PronType>;
