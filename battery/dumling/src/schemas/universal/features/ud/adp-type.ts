import { z } from "zod";

const CIRC = z.literal("Circ");
const POST = z.literal("Post");
const PREP = z.literal("Prep");
const VOC = z.literal("Voc");

// Source: https://universaldependencies.org/u/feat/AdpType.html
export const AdpTypeSchema = z.enum([
	CIRC.value,
	POST.value,
	PREP.value,
	VOC.value,
]);
export const AdpType = AdpTypeSchema.enum;
export type AdpType = z.infer<typeof AdpTypeSchema>;
