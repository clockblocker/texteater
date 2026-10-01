import { z } from "zod";

/**
 * A lexically reflexive Lemma's reflexive case, fixed per word: German *sich
 * erinnern* takes Acc, *sich etwas vorstellen* Dat (system ADR 0029).
 */
export const LexicallyReflexiveSchema = z.enum(["Acc", "Dat"]);
export const LexicallyReflexive = LexicallyReflexiveSchema.enum;
export type LexicallyReflexive = z.infer<typeof LexicallyReflexiveSchema>;
