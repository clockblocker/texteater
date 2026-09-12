import { z } from "zod";

const FH = z.literal("Fh");
const NFH = z.literal("Nfh");

// Source: https://universaldependencies.org/u/feat/Evident.html
export const EvidentSchema = z.enum([FH.value, NFH.value]);
export const Evident = EvidentSchema.enum;
export type Evident = z.infer<typeof EvidentSchema>;
