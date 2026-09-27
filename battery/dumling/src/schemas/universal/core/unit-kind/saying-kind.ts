import { z } from "zod";

const SAYING = z.literal("Saying");

/** The Saying Family has one Kind; Proverb and Winged Word are Reading Knowledge (ADR 0039). */
export const SayingKindSchema = z.enum([SAYING.value]);
export const SayingKind = SayingKindSchema.enum;
export type SayingKind = z.infer<typeof SayingKindSchema>;
