const adpTypeValues = ["Circ", "Post", "Prep", "Voc"] as const;

// Source: https://universaldependencies.org/u/feat/AdpType.html
export const AdpType = adpTypeValues;
export type AdpType = (typeof AdpType)[number];
