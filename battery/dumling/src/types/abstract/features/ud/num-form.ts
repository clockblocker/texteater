const numFormValues = ["Combi", "Digit", "Roman", "Word"] as const;

// Source: https://universaldependencies.org/u/feat/NumForm.html
export const NumForm = numFormValues;
export type NumForm = (typeof NumForm)[number];
