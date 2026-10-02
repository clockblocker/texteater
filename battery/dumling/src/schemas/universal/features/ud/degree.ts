import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Degree.html
export const DegreeSchema = z.enum([
	"Abs", // absolute superlative
	"Aug", // augmentative
	"Cmp", // comparative; second degree
	"Dim", // diminutive
	"Equ", // equative
	"Pos", // positive; first degree
	"Sup", // superlative; third degree
]);
