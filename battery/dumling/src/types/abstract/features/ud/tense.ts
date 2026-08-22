const tenseValues = [
	"Fut", // future
	"Imp", // imperfect
	"Past", // past; preterite / aorist
	"Pqp", // pluperfect
	"Pres", // present; non-past / aorist
] as const;

// Source: https://universaldependencies.org/u/feat/Tense.html
export const Tense = tenseValues;
export type Tense = (typeof Tense)[number];
