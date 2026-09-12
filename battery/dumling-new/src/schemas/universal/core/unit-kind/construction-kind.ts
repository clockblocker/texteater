import { z } from "zod";

const FUSION = z.literal("Fusion");

export const ConstructionKindSchema = z.enum([FUSION.value]);
export const ConstructionKind = ConstructionKindSchema.enum;
export type ConstructionKind = z.infer<typeof ConstructionKindSchema>;
