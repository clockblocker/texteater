import { z } from "zod";

export const HasSepPrefix = z.string().min(1);
export type HasSepPrefix = z.infer<typeof HasSepPrefix>;
