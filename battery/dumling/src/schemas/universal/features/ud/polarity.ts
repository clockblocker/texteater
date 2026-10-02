import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Polarity.html
export const PolaritySchema = z.enum(["Neg", "Pos"]);
