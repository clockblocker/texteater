import { z } from "zod";

const COLL = z.literal("Coll"); // collective; mass / singulare tantum
const COUNT = z.literal("Count"); // count plural
const DUAL = z.literal("Dual"); // dual
const GRPA = z.literal("Grpa"); // greater paucal
const GRPL = z.literal("Grpl"); // greater plural
const INV = z.literal("Inv"); // inverse
const PAUC = z.literal("Pauc"); // paucal
const PLUR = z.literal("Plur"); // plural
const PTAN = z.literal("Ptan"); // plurale tantum
const SING = z.literal("Sing"); // singular
const TRI = z.literal("Tri"); // trial

// Source: https://universaldependencies.org/u/feat/Number.html
export const GrammaticalNumberSchema = z.enum([
	COLL.value,
	COUNT.value,
	DUAL.value,
	GRPA.value,
	GRPL.value,
	INV.value,
	PAUC.value,
	PLUR.value,
	PTAN.value,
	SING.value,
	TRI.value,
]);
export const GrammaticalNumber = GrammaticalNumberSchema.enum;
export type GrammaticalNumber = z.infer<typeof GrammaticalNumberSchema>;
