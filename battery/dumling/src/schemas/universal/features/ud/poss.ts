import { z } from "zod";

const YES = z.literal("Yes");

// Source: https://universaldependencies.org/u/feat/Poss.html
export const PossSchema = z.enum([YES.value]);
export const Poss = PossSchema.enum;
export type Poss = z.infer<typeof PossSchema>;
