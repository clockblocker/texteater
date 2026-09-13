import { z } from "zod";

const ART = z.literal("Art");
const DEM = z.literal("Dem");
const EMP = z.literal("Emp");
const EXC = z.literal("Exc");
const IND = z.literal("Ind");
const INT = z.literal("Int");
const NEG = z.literal("Neg");
const PRS = z.literal("Prs");
const RCP = z.literal("Rcp");
const REL = z.literal("Rel");
const TOT = z.literal("Tot");

// Source: https://universaldependencies.org/u/feat/PronType.html
export const PronTypeSchema = z.enum([
	ART.value,
	DEM.value,
	EMP.value,
	EXC.value,
	IND.value,
	INT.value,
	NEG.value,
	PRS.value,
	RCP.value,
	REL.value,
	TOT.value,
]);
export const PronType = PronTypeSchema.enum;
export type PronType = z.infer<typeof PronTypeSchema>;
