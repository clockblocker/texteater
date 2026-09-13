import { z } from "zod";

const ADJ = z.literal("ADJ");
const ADV = z.literal("ADV");
const INTJ = z.literal("INTJ");
const NOUN = z.literal("NOUN");
const PROPN = z.literal("PROPN");
const VERB = z.literal("VERB");

const ADP = z.literal("ADP");
const AUX = z.literal("AUX");
const CCONJ = z.literal("CCONJ");
const DET = z.literal("DET");
const NUM = z.literal("NUM");
const PART = z.literal("PART");
const PRON = z.literal("PRON");
const SCONJ = z.literal("SCONJ");

const PUNCT = z.literal("PUNCT");
const SYM = z.literal("SYM");
const X = z.literal("X");

export const PosSchema = z.enum([
	ADJ.value,
	ADV.value,
	INTJ.value,
	NOUN.value,
	PROPN.value,
	VERB.value,
	ADP.value,
	AUX.value,
	CCONJ.value,
	DET.value,
	NUM.value,
	PART.value,
	PRON.value,
	SCONJ.value,
	PUNCT.value,
	SYM.value,
	X.value,
]);
export const Pos = PosSchema.enum;
export type Pos = z.infer<typeof PosSchema>;
