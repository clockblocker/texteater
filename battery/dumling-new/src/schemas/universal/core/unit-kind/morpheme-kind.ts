import { z } from "zod";

const ROOT = z.literal("Root");
const PREFIX = z.literal("Prefix");
const SUFFIX = z.literal("Suffix");
const SUFFIXOID = z.literal("Suffixoid");
const INFIX = z.literal("Infix");
const CIRCUMFIX = z.literal("Circumfix");
const INTERFIX = z.literal("Interfix");
const TRANSFIX = z.literal("Transfix");
const CLITIC = z.literal("Clitic");
const TONE_MARKING = z.literal("ToneMarking");
const DUPLIFIX = z.literal("Duplifix");

export const MorphemeKindSchema = z.enum([
	ROOT.value,
	PREFIX.value,
	SUFFIX.value,
	SUFFIXOID.value,
	INFIX.value,
	CIRCUMFIX.value,
	INTERFIX.value,
	TRANSFIX.value,
	CLITIC.value,
	TONE_MARKING.value,
	DUPLIFIX.value,
]);
export const MorphemeKind = MorphemeKindSchema.enum;
export type MorphemeKind = z.infer<typeof MorphemeKindSchema>;
