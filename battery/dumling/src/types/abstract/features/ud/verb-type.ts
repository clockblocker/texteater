import { z } from "zod";

const verbTypeValues = ["Aux", "Cop", "Light", "Mod", "Quasi"] as const;

// Source: https://universaldependencies.org/u/feat/VerbType.html
export const VerbType = z.enum(verbTypeValues);
export type VerbType = z.infer<typeof VerbType>;
