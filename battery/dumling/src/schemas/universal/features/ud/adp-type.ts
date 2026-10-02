import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/AdpType.html
export const AdpTypeSchema = z.enum(["Circ", "Post", "Prep", "Voc"]);
