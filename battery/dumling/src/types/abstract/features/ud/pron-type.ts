const pronTypeValues = [
	"Art",
	"Dem",
	"Emp",
	"Exc",
	"Ind",
	"Int",
	"Neg",
	"Prs",
	"Rcp",
	"Rel",
	"Tot",
] as const;

// Source: https://universaldependencies.org/u/feat/PronType.html
export const PronType = pronTypeValues;
export type PronType = (typeof PronType)[number];
