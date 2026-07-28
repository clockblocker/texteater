import { z } from "zod";

const animacyValues = ["Anim", "Hum", "Inan", "Nhum"] as const;

// Source: https://universaldependencies.org/u/feat/Animacy.html
export const Animacy = z.enum(animacyValues);
export type Animacy = z.infer<typeof Animacy>;
