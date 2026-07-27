import { z } from "zod/v3";

const definiteValues = [
	"Com", // complex
	"Cons", // construct state; reduced definiteness
	"Def", // definite
	"Ind", // indefinite
	"Spec", // specific indefinite
] as const;

// Source: https://universaldependencies.org/u/feat/Definite.html
export const Definite = z.enum(definiteValues);
export type Definite = z.infer<typeof Definite>;
