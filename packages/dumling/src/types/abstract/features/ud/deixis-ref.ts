import { z } from "zod/v3";

const deixisRefValues = [
	"1", // relative to the first person participant; speaker
	"2", // relative to the second person participant; hearer
] as const;

// Source: https://universaldependencies.org/u/feat/DeixisRef.html
export const DeixisRef = z.enum(deixisRefValues);
export type DeixisRef = z.infer<typeof DeixisRef>;
