import { z } from "zod";

const BRCK = z.literal("Brck");
const COLO = z.literal("Colo");
const COMM = z.literal("Comm");
const DASH = z.literal("Dash");
const ELIP = z.literal("Elip");
const EXCL = z.literal("Excl");
const PERI = z.literal("Peri");
const QEST = z.literal("Qest");
const QUOT = z.literal("Quot");

// Source: https://universaldependencies.org/u/feat/PunctType.html
export const PunctTypeSchema = z.enum([
	BRCK.value,
	COLO.value,
	COMM.value,
	DASH.value,
	ELIP.value,
	EXCL.value,
	PERI.value,
	QEST.value,
	QUOT.value,
]);
export const PunctType = PunctTypeSchema.enum;
export type PunctType = z.infer<typeof PunctTypeSchema>;
