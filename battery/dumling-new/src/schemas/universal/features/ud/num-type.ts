import { z } from "zod";

const CARD = z.literal("Card"); // cardinal number; or corresponding interrogative / relative / indefinite / demonstrative word
const DIST = z.literal("Dist"); // distributive numeral
const FRAC = z.literal("Frac"); // fraction
const MULT = z.literal("Mult"); // multiplicative numeral; or corresponding interrogative / relative / indefinite / demonstrative word
const ORD = z.literal("Ord"); // ordinal number; or corresponding interrogative / relative / indefinite / demonstrative word
const RANGE = z.literal("Range"); // range of values
const SETS = z.literal("Sets"); // number of sets of things; collective numeral

// Source: https://universaldependencies.org/u/feat/NumType.html
export const NumTypeSchema = z.enum([
	CARD.value,
	DIST.value,
	FRAC.value,
	MULT.value,
	ORD.value,
	RANGE.value,
	SETS.value,
]);
export const NumType = NumTypeSchema.enum;
export type NumType = z.infer<typeof NumTypeSchema>;
