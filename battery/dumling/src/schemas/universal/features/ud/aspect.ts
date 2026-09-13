import { z } from "zod";

const HAB = z.literal("Hab"); // habitual
const IMP = z.literal("Imp"); // imperfect
const ITER = z.literal("Iter"); // iterative; frequentative
const PERF = z.literal("Perf"); // perfect
const PROG = z.literal("Prog"); // progressive
const PROSP = z.literal("Prosp"); // prospective

// Source: https://universaldependencies.org/u/feat/Aspect.html
export const AspectSchema = z.enum([
	HAB.value,
	IMP.value,
	ITER.value,
	PERF.value,
	PROG.value,
	PROSP.value,
]);
export const Aspect = AspectSchema.enum;
export type Aspect = z.infer<typeof AspectSchema>;
