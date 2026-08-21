const politeValues = ["Elev", "Form", "Humb", "Infm"] as const;

// Source: https://universaldependencies.org/u/feat/Polite.html
export const Polite = politeValues;
export type Polite = (typeof Polite)[number];
