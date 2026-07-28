import { z } from "zod";

export const LexicallyReflexive = z.literal("Yes");
export type LexicallyReflexive = z.infer<typeof LexicallyReflexive>;
