import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Abbr.html

export const Abbr = z.literal("Yes");
export type Abbr = z.infer<typeof Abbr>;
