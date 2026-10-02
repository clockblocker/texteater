import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Hyph.html
export const HyphSchema = z.enum(["Yes"]);
