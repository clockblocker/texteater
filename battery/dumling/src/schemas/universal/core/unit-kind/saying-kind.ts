import { z } from "zod";

/** The Saying Family has one Kind; Proverb and Winged Word are Reading Knowledge (ADR 0039). */
export const SayingKindSchema = z.enum(["Saying"]);
