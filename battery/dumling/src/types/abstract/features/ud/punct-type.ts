const punctTypeValues = [
	"Brck",
	"Colo",
	"Comm",
	"Dash",
	"Elip",
	"Excl",
	"Peri",
	"Qest",
	"Quot",
] as const;

// Source: https://universaldependencies.org/u/feat/PunctType.html
export const PunctType = punctTypeValues;
export type PunctType = (typeof PunctType)[number];
