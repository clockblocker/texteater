import { z } from "zod";

export const Phrasal = z.literal("Yes");
export type Phrasal = z.infer<typeof Phrasal>;
