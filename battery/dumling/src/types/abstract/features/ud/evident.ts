const evidentValues = ["Fh", "Nfh"] as const;

// Source: https://universaldependencies.org/u/feat/Evident.html
export const Evident = evidentValues;
export type Evident = (typeof Evident)[number];
