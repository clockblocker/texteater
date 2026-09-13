import { z } from "zod";

const VALUE_0 = z.literal("0");
const VALUE_1 = z.literal("1");
const VALUE_2 = z.literal("2");
const VALUE_3 = z.literal("3");
const VALUE_4 = z.literal("4");

// Source: https://universaldependencies.org/u/feat/Person.html
export const PersonSchema = z.enum([
	VALUE_0.value,
	VALUE_1.value,
	VALUE_2.value,
	VALUE_3.value,
	VALUE_4.value,
]);
export const Person = PersonSchema.enum;
export type Person = z.infer<typeof PersonSchema>;
