import { z } from "zod/v3";

const tenseValues = [
	"Fut", // future
	"Imp", // imperfect
	"Past", // past; preterite / aorist
	"Pqp", // pluperfect
	"Pres", // present; non-past / aorist
] as const;

// Source: https://universaldependencies.org/u/feat/Tense.html
export const Tense = z.enum(tenseValues);
export type Tense = z.infer<typeof Tense>;
