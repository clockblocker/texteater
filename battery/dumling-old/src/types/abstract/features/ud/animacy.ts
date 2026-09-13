const animacyValues = ["Anim", "Hum", "Inan", "Nhum"] as const;

// Source: https://universaldependencies.org/u/feat/Animacy.html
export const Animacy = animacyValues;
export type Animacy = (typeof Animacy)[number];
