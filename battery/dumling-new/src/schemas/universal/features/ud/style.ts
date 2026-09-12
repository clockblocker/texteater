import { z } from "zod";

const ARCH = z.literal("Arch");
const COLL = z.literal("Coll");
const EXPR = z.literal("Expr");
const FORM = z.literal("Form");
const RARE = z.literal("Rare");
const SLNG = z.literal("Slng");
const VRNC = z.literal("Vrnc");
const VULG = z.literal("Vulg");

// Source: https://universaldependencies.org/u/feat/Style.html
export const StyleSchema = z.enum([
	ARCH.value,
	COLL.value,
	EXPR.value,
	FORM.value,
	RARE.value,
	SLNG.value,
	VRNC.value,
	VULG.value,
]);
export const Style = StyleSchema.enum;
export type Style = z.infer<typeof StyleSchema>;
