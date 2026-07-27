import { z } from "zod/v3";

const aspectValues = [
	"Hab", // habitual
	"Imp", // imperfect
	"Iter", // iterative; frequentative
	"Perf", // perfect
	"Prog", // progressive
	"Prosp", // prospective
] as const;

// Source: https://universaldependencies.org/u/feat/Aspect.html
export const Aspect = z.enum(aspectValues);
export type Aspect = z.infer<typeof Aspect>;
