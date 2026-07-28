import { z } from "zod";

const genderValues = ["Com", "Fem", "Masc", "Neut"] as const;

// Source: https://universaldependencies.org/u/feat/Gender.html
export const Gender = z.enum(genderValues);
export type Gender = z.infer<typeof Gender>;
