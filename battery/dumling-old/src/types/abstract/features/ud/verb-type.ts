const verbTypeValues = ["Aux", "Cop", "Light", "Mod", "Quasi"] as const;

// Source: https://universaldependencies.org/u/feat/VerbType.html
export const VerbType = verbTypeValues;
export type VerbType = (typeof VerbType)[number];
