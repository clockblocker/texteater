import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/VerbType.html
export const VerbTypeSchema = z.enum(["Aux", "Cop", "Light", "Mod", "Quasi"]);
