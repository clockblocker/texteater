const variantValues = ["Short"] as const;

// Source: https://universaldependencies.org/treebanks/de_hdt/de_hdt-feat-Variant.html
export const Variant = variantValues;
export type Variant = (typeof Variant)[number];
