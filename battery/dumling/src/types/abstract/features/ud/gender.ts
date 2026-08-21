const genderValues = ["Com", "Fem", "Masc", "Neut"] as const;

// Source: https://universaldependencies.org/u/feat/Gender.html
export const Gender = genderValues;
export type Gender = (typeof Gender)[number];
