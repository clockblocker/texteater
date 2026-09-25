import { z } from "zod";

/** Construction presence across the complete verbal Surface, independent of finite tense. */
export const PerfectConstructionSchema = z.literal("Yes");
export const FutureConstructionSchema = z.literal("Yes");
/** A passive construction: werden (Process) or bekommen, kriegen, erhalten (Recipient). */
export const PassiveConstructionSchema = z.enum(["Process", "Recipient"]);
/** Morphology of a whole participial Surface; it does not assert a perfect construction. */
export const ParticipleFormSchema = z.enum(["Present", "Past"]);
