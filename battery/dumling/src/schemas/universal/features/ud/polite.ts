import { z } from "zod";

const ELEV = z.literal("Elev");
const FORM = z.literal("Form");
const HUMB = z.literal("Humb");
const INFM = z.literal("Infm");

// Source: https://universaldependencies.org/u/feat/Polite.html
export const PoliteSchema = z.enum([
	ELEV.value,
	FORM.value,
	HUMB.value,
	INFM.value,
]);
export const Polite = PoliteSchema.enum;
export type Polite = z.infer<typeof PoliteSchema>;
