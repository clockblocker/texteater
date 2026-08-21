import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Reflex.html
export const Reflex = z.literal("Yes");
export type Reflex = z.infer<typeof Reflex>;
