import { z } from "zod/v3";

export const Phrasal = z.literal("Yes");
export type Phrasal = z.infer<typeof Phrasal>;
