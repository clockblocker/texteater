const deixisValues = [
	"Abv",
	"Bel",
	"Even",
	"Med",
	"Nvis",
	"Prox",
	"Remt",
] as const;

// Source: https://universaldependencies.org/u/feat/Deixis.html
export const Deixis = deixisValues;
export type Deixis = (typeof Deixis)[number];
