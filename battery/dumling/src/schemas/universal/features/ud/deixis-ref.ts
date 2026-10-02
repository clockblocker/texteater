import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/DeixisRef.html
export const DeixisRefSchema = z.enum([
	"1", // relative to the first person participant; speaker
	"2", // relative to the second person participant; hearer
]);
