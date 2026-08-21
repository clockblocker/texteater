import { z } from "zod";

const adpTypeValues = ["Circ", "Post", "Prep", "Voc"] as const;

// Source: https://universaldependencies.org/u/feat/AdpType.html
export const AdpType = z.enum(adpTypeValues);
export type AdpType = z.infer<typeof AdpType>;
