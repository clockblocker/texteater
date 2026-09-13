import { z } from "zod";

const FUT = z.literal("Fut"); // future
const IMP = z.literal("Imp"); // imperfect
const PAST = z.literal("Past"); // past; preterite / aorist
const PQP = z.literal("Pqp"); // pluperfect
const PRES = z.literal("Pres"); // present; non-past / aorist

// Source: https://universaldependencies.org/u/feat/Tense.html
export const TenseSchema = z.enum([
	FUT.value,
	IMP.value,
	PAST.value,
	PQP.value,
	PRES.value,
]);
export const Tense = TenseSchema.enum;
export type Tense = z.infer<typeof TenseSchema>;
