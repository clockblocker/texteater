import { z } from "zod";

const CITATION = z.literal("Citation");
const INFLECTION = z.literal("Inflection");

export const SurfaceKindSchema = z.enum([CITATION.value, INFLECTION.value]);
export const SurfaceKind = SurfaceKindSchema.enum;
export type SurfaceKind = z.infer<typeof SurfaceKindSchema>;
