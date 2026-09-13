import { z } from "zod";

const YES = z.literal("Yes");

export const LexicallyReflexiveSchema = z.enum([YES.value]);
export const LexicallyReflexive = LexicallyReflexiveSchema.enum;
export type LexicallyReflexive = z.infer<typeof LexicallyReflexiveSchema>;
