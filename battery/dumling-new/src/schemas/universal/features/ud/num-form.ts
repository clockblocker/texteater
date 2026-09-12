import { z } from "zod";

const COMBI = z.literal("Combi");
const DIGIT = z.literal("Digit");
const ROMAN = z.literal("Roman");
const WORD = z.literal("Word");

// Source: https://universaldependencies.org/u/feat/NumForm.html
export const NumFormSchema = z.enum([
	COMBI.value,
	DIGIT.value,
	ROMAN.value,
	WORD.value,
]);
export const NumForm = NumFormSchema.enum;
export type NumForm = z.infer<typeof NumFormSchema>;
