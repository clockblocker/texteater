const clusivityValues = ["Ex", "In"] as const;

// Source: https://universaldependencies.org/u/feat/Clusivity.html
export const Clusivity = clusivityValues;
export type Clusivity = (typeof Clusivity)[number];
