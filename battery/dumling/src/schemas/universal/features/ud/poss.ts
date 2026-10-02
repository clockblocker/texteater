import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Poss.html
export const PossSchema = z.enum(["Yes"]);
