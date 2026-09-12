import { z } from "zod";

const YES = z.literal("Yes");

// Source: https://universaldependencies.org/u/feat/Abbr.html
export const AbbrSchema = z.enum([YES.value]);
export const Abbr = AbbrSchema.enum;
export type Abbr = z.infer<typeof AbbrSchema>;
