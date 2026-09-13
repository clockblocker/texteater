import { z } from "zod";

const YES = z.literal("Yes");

// Source: https://universaldependencies.org/u/feat/Foreign.html
export const ForeignSchema = z.enum([YES.value]);
export const Foreign = ForeignSchema.enum;
export type Foreign = z.infer<typeof ForeignSchema>;
