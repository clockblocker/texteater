import { z } from "zod";

export const HasGovPrepSchema = z.string().min(1);
export type HasGovPrep = z.infer<typeof HasGovPrepSchema>;
