import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Number.html
export const GrammaticalNumberSchema = z.enum([
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
]);
