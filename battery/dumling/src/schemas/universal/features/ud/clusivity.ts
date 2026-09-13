import { z } from "zod";

const EX = z.literal("Ex");
const IN = z.literal("In");

// Source: https://universaldependencies.org/u/feat/Clusivity.html
export const ClusivitySchema = z.enum([EX.value, IN.value]);
export const Clusivity = ClusivitySchema.enum;
export type Clusivity = z.infer<typeof ClusivitySchema>;
