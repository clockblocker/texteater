import { z } from "zod";

const politeValues = ["Elev", "Form", "Humb", "Infm"] as const;

// Source: https://universaldependencies.org/u/feat/Polite.html
export const Polite = z.enum(politeValues);
export type Polite = z.infer<typeof Polite>;
