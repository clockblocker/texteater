const aspectValues = [
	"Hab", // habitual
	"Imp", // imperfect
	"Iter", // iterative; frequentative
	"Perf", // perfect
	"Prog", // progressive
	"Prosp", // prospective
] as const;

// Source: https://universaldependencies.org/u/feat/Aspect.html
export const Aspect = aspectValues;
export type Aspect = (typeof Aspect)[number];
