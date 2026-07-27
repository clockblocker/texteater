import { z } from "zod/v3";

const degreeValues = [
	"Abs", // absolute superlative
	"Aug", // augmentative
	"Cmp", // comparative; second degree
	"Dim", // diminutive
	"Equ", // equative
	"Pos", // positive; first degree
	"Sup", // superlative; third degree
] as const;

// Source: https://universaldependencies.org/u/feat/Degree.html
export const Degree = z.enum(degreeValues);
export type Degree = z.infer<typeof Degree>;
