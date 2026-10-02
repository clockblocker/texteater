import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Definite.html
export const DefiniteSchema = z.enum([
	"Com", // complex
	"Cons", // construct state; reduced definiteness
	"Def", // definite
	"Ind", // indefinite
	"Spec", // specific indefinite
]);
