import { z } from "zod";

const conjTypeValues = ["Comp", "Oper"] as const;

// Source: https://universaldependencies.org/hy/feat/ConjType.html
export const ConjType = z.enum(conjTypeValues);
export type ConjType = z.infer<typeof ConjType>;
