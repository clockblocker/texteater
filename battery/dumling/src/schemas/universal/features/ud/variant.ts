import { z } from "zod";

// Source: https://universaldependencies.org/treebanks/de_hdt/de_hdt-feat-Variant.html
export const VariantSchema = z.enum(["Short"]);
