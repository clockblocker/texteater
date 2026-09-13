import { z } from "zod";

const YES = z.literal("Yes");

// Source: https://universaldependencies.org/he/index.html
export const HebExistentialSchema = z.enum([YES.value]);
export const HebExistential = HebExistentialSchema.enum;
export type HebExistential = z.infer<typeof HebExistentialSchema>;
