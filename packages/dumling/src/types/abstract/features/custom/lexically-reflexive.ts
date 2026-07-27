import { z } from "zod/v3";

export const LexicallyReflexive = z.literal("Yes");
export type LexicallyReflexive = z.infer<typeof LexicallyReflexive>;
