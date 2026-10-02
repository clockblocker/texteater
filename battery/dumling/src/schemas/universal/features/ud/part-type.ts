import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/PartType.html
export const PartTypeSchema = z.enum(["Inf", "Mod", "Res", "Vbp"]);
