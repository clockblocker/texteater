const polarityValues = ["Neg", "Pos"] as const;

// Source: https://universaldependencies.org/u/feat/Polarity.html
export const Polarity = polarityValues;
export type Polarity = (typeof Polarity)[number];
