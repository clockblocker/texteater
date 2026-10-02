import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Tense.html
export const TenseSchema = z.enum([
	"Fut", // future
	"Imp", // imperfect
	"Past", // past; preterite / aorist
	"Pqp", // pluperfect
	"Pres", // present; non-past / aorist
]);
