import { z } from "zod";

const ABS = z.literal("Abs"); // absolute superlative
const AUG = z.literal("Aug"); // augmentative
const CMP = z.literal("Cmp"); // comparative; second degree
const DIM = z.literal("Dim"); // diminutive
const EQU = z.literal("Equ"); // equative
const POS = z.literal("Pos"); // positive; first degree
const SUP = z.literal("Sup"); // superlative; third degree

// Source: https://universaldependencies.org/u/feat/Degree.html
export const DegreeSchema = z.enum([
	ABS.value,
	AUG.value,
	CMP.value,
	DIM.value,
	EQU.value,
	POS.value,
	SUP.value,
]);
export const Degree = DegreeSchema.enum;
export type Degree = z.infer<typeof DegreeSchema>;
