import { z } from "zod";

const YES = z.literal("Yes");

export const PhrasalSchema = z.enum([YES.value]);
export const Phrasal = PhrasalSchema.enum;
export type Phrasal = z.infer<typeof PhrasalSchema>;
