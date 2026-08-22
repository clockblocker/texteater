const partTypeValues = ["Inf", "Mod", "Res", "Vbp"] as const;

// Source: https://universaldependencies.org/u/feat/PartType.html
export const PartType = partTypeValues;
export type PartType = (typeof PartType)[number];
