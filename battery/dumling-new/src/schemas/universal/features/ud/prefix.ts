import { z } from "zod";

const YES = z.literal("Yes");

// Source: https://universaldependencies.org/he/index.html
export const PrefixSchema = z.enum([YES.value]);
export const Prefix = PrefixSchema.enum;
export type Prefix = z.infer<typeof PrefixSchema>;
