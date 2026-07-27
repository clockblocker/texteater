import { z } from "zod/v3";

const polarityValues = ["Neg", "Pos"] as const;

// Source: https://universaldependencies.org/u/feat/Polarity.html
export const Polarity = z.enum(polarityValues);
export type Polarity = z.infer<typeof Polarity>;
