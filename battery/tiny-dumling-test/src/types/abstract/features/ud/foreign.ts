import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Foreign.html
export const Foreign = z.literal("Yes");
export type Foreign = z.infer<typeof Foreign>;
