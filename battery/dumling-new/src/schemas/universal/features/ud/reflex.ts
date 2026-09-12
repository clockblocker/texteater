import { z } from "zod";

const YES = z.literal("Yes");

// Source: https://universaldependencies.org/u/feat/Reflex.html
export const ReflexSchema = z.enum([YES.value]);
export const Reflex = ReflexSchema.enum;
export type Reflex = z.infer<typeof ReflexSchema>;
