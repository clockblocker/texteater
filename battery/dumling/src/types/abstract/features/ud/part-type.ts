import { z } from "zod";

const partTypeValues = ["Inf", "Mod", "Res", "Vbp"] as const;

// Source: https://universaldependencies.org/u/feat/PartType.html
export const PartType = z.enum(partTypeValues);
export type PartType = z.infer<typeof PartType>;
