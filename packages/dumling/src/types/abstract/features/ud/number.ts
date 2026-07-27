import { z } from "zod/v3";

const numberValues = [
	"Coll", // collective; mass / singulare tantum
	"Count", // count plural
	"Dual", // dual
	"Grpa", // greater paucal
	"Grpl", // greater plural
	"Inv", // inverse
	"Pauc", // paucal
	"Plur", // plural
	"Ptan", // plurale tantum
	"Sing", // singular
	"Tri", // trial
] as const;

// Source: https://universaldependencies.org/u/feat/Number.html
export const GrammaticalNumber = z.enum(numberValues);
export type GrammaticalNumber = z.infer<typeof GrammaticalNumber>;
