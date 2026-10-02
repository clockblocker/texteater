import { z } from "zod";

// Source: https://universaldependencies.org/he/index.html
export const PrefixSchema = z.enum(["Yes"]);
