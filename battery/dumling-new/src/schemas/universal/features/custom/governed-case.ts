import type { z } from "zod";
import { CaseSchema } from "../ud/case.js";

export const GovernedCaseSchema = CaseSchema;
export const GovernedCase = GovernedCaseSchema.enum;
export type GovernedCase = z.infer<typeof GovernedCaseSchema>;
