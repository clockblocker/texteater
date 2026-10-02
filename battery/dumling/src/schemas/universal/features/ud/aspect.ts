import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Aspect.html
export const AspectSchema = z.enum([
	"Hab", // habitual
	"Imp", // imperfect
	"Iter", // iterative; frequentative
	"Perf", // perfect
	"Prog", // progressive
	"Prosp", // prospective
]);
