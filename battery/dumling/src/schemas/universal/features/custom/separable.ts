import { z } from "zod";

export const HasSepPrefixSchema = z.string().min(1);
