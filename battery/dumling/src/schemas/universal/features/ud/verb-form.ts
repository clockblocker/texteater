import { z } from "zod";

const CONV = z.literal("Conv"); // converb; transgressive, adverbial participle, verbal adverb
const FIN = z.literal("Fin"); // finite verb
const GDV = z.literal("Gdv"); // gerundive
const GER = z.literal("Ger"); // gerund
const INF = z.literal("Inf"); // infinitive
const PART = z.literal("Part"); // participle; verbal adjective
const SUP = z.literal("Sup"); // supine
const VNOUN = z.literal("Vnoun"); // verbal noun; masdar

// Source: https://universaldependencies.org/u/feat/VerbForm.html
export const VerbFormSchema = z.enum([
	CONV.value,
	FIN.value,
	GDV.value,
	GER.value,
	INF.value,
	PART.value,
	SUP.value,
	VNOUN.value,
]);
export const VerbForm = VerbFormSchema.enum;
export type VerbForm = z.infer<typeof VerbFormSchema>;
