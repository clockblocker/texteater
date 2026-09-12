import { z } from "zod";

export const HasSepPrefixSchema = z.string().min(1);
export type HasSepPrefix = z.infer<typeof HasSepPrefixSchema>;
