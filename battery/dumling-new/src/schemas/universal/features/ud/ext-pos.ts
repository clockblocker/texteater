import { z } from "zod";

const ADJ = z.literal("ADJ");
const ADP = z.literal("ADP");
const ADV = z.literal("ADV");
const AUX = z.literal("AUX");
const CCONJ = z.literal("CCONJ");
const DET = z.literal("DET");
const INTJ = z.literal("INTJ");
const PRON = z.literal("PRON");
const PROPN = z.literal("PROPN");
const SCONJ = z.literal("SCONJ");

// Source: https://universaldependencies.org/u/feat/ExtPos.html
export const ExtPosSchema = z.enum([
	ADJ.value,
	ADP.value,
	ADV.value,
	AUX.value,
	CCONJ.value,
	DET.value,
	INTJ.value,
	PRON.value,
	PROPN.value,
	SCONJ.value,
]);
export const ExtPos = ExtPosSchema.enum;
export type ExtPos = z.infer<typeof ExtPosSchema>;
