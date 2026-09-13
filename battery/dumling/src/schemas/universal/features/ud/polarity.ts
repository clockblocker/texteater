import { z } from "zod";

const NEG = z.literal("Neg");
const POS = z.literal("Pos");

// Source: https://universaldependencies.org/u/feat/Polarity.html
export const PolaritySchema = z.enum([NEG.value, POS.value]);
export const Polarity = PolaritySchema.enum;
export type Polarity = z.infer<typeof PolaritySchema>;
