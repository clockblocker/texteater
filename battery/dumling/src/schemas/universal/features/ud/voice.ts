import { z } from "zod";

const ACT = z.literal("Act"); // active; actor-focus
const ANTIP = z.literal("Antip"); // antipassive
const BFOC = z.literal("Bfoc"); // beneficiary-focus
const CAU = z.literal("Cau"); // causative
const DIR = z.literal("Dir"); // direct
const INV = z.literal("Inv"); // inverse
const LFOC = z.literal("Lfoc"); // location-focus
const MID = z.literal("Mid"); // middle
const PASS = z.literal("Pass"); // passive; patient-focus
const RCP = z.literal("Rcp"); // reciprocal

// Source: https://universaldependencies.org/u/feat/Voice.html
export const VoiceSchema = z.enum([
	ACT.value,
	ANTIP.value,
	BFOC.value,
	CAU.value,
	DIR.value,
	INV.value,
	LFOC.value,
	MID.value,
	PASS.value,
	RCP.value,
]);
export const Voice = VoiceSchema.enum;
export type Voice = z.infer<typeof VoiceSchema>;
