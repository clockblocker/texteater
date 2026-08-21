import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Poss.html
export const Poss = z.literal("Yes");
export type Poss = z.infer<typeof Poss>;
