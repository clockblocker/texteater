import { z } from "zod/v3";

const personValues = ["0", "1", "2", "3", "4"] as const;

// Source: https://universaldependencies.org/u/feat/Person.html
export const Person = z.enum(personValues);
export type Person = z.infer<typeof Person>;
