import { z } from "zod";

const YES = z.literal("Yes");

// Source: https://universaldependencies.org/u/feat/Hyph.html
export const HyphSchema = z.enum([YES.value]);
export const Hyph = HyphSchema.enum;
export type Hyph = z.infer<typeof HyphSchema>;
