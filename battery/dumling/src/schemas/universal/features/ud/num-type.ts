import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/NumType.html
export const NumTypeSchema = z.enum([
	"Card", // cardinal number; or corresponding interrogative / relative / indefinite / demonstrative word
	"Dist", // distributive numeral
	"Frac", // fraction
	"Mult", // multiplicative numeral; or corresponding interrogative / relative / indefinite / demonstrative word
	"Ord", // ordinal number; or corresponding interrogative / relative / indefinite / demonstrative word
	"Range", // range of values
	"Sets", // number of sets of things; collective numeral
]);
