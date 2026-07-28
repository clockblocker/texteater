import { z } from "zod";

const polarityValues = ["Neg", "Pos"] as const;

// Source: https://universaldependencies.org/u/feat/Polarity.html
export const Polarity = z.enum(polarityValues);
export type Polarity = z.infer<typeof Polarity>;
