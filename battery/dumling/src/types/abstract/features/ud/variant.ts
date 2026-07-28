import { z } from "zod";

const variantValues = ["Short"] as const;

// Source: https://universaldependencies.org/treebanks/de_hdt/de_hdt-feat-Variant.html
export const Variant = z.enum(variantValues);
export type Variant = z.infer<typeof Variant>;
