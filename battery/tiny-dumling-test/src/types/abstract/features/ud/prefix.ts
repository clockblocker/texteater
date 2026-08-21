import { z } from "zod";

// Source: https://universaldependencies.org/he/index.html
export const Prefix = z.literal("Yes");
export type Prefix = z.infer<typeof Prefix>;
