import { z } from "zod/v3";

const numFormValues = ["Combi", "Digit", "Roman", "Word"] as const;

// Source: https://universaldependencies.org/u/feat/NumForm.html
export const NumForm = z.enum(numFormValues);
export type NumForm = z.infer<typeof NumForm>;
