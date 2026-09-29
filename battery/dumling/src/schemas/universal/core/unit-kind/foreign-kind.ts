import { z } from "zod";

const FOREIGN = z.literal("Foreign");

/** The Foreign Family has one Kind: foreign material has no part of speech in the text's language (ADR 0045). */
export const ForeignKindSchema = z.enum([FOREIGN.value]);
export const ForeignKind = ForeignKindSchema.enum;
export type ForeignKind = z.infer<typeof ForeignKindSchema>;
