const styleValues = [
	"Arch",
	"Coll",
	"Expr",
	"Form",
	"Rare",
	"Slng",
	"Vrnc",
	"Vulg",
] as const;

// Source: https://universaldependencies.org/u/feat/Style.html
export const Style = styleValues;
export type Style = (typeof Style)[number];
