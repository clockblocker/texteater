import { z } from "zod/v3";

const evidentValues = ["Fh", "Nfh"] as const;

// Source: https://universaldependencies.org/u/feat/Evident.html
export const Evident = z.enum(evidentValues);
export type Evident = z.infer<typeof Evident>;
