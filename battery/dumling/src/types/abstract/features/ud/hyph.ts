import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Hyph.html
export const Hyph = z.literal("Yes");
export type Hyph = z.infer<typeof Hyph>;
