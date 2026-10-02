import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Style.html
export const StyleSchema = z.enum([
	"Arch",
	"Coll",
	"Expr",
	"Form",
	"Rare",
	"Slng",
	"Vrnc",
	"Vulg",
]);
