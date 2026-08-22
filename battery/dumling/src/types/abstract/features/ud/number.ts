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
export const GrammaticalNumber = numberValues;
export type GrammaticalNumber = (typeof GrammaticalNumber)[number];
