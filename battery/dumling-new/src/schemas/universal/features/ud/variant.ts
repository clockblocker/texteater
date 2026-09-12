import { z } from "zod";

const SHORT = z.literal("Short");

// Source: https://universaldependencies.org/treebanks/de_hdt/de_hdt-feat-Variant.html
export const VariantSchema = z.enum([SHORT.value]);
export const Variant = VariantSchema.enum;
export type Variant = z.infer<typeof VariantSchema>;
