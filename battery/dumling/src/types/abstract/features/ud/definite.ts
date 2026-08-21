const definiteValues = [
	"Com", // complex
	"Cons", // construct state; reduced definiteness
	"Def", // definite
	"Ind", // indefinite
	"Spec", // specific indefinite
] as const;

// Source: https://universaldependencies.org/u/feat/Definite.html
export const Definite = definiteValues;
export type Definite = (typeof Definite)[number];
