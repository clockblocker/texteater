import { z } from "zod/v3";

const clusivityValues = ["Ex", "In"] as const;

// Source: https://universaldependencies.org/u/feat/Clusivity.html
export const Clusivity = z.enum(clusivityValues);
export type Clusivity = z.infer<typeof Clusivity>;
