const conjTypeValues = ["Comp", "Oper"] as const;

// Source: https://universaldependencies.org/hy/feat/ConjType.html
export const ConjType = conjTypeValues;
export type ConjType = (typeof ConjType)[number];
