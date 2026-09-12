import { z } from "zod";

const ADM = z.literal("Adm"); // admirative
const CND = z.literal("Cnd"); // conditional
const DES = z.literal("Des"); // desiderative
const IMP = z.literal("Imp"); // imperative
const IND = z.literal("Ind"); // indicative; or realis
const INT = z.literal("Int"); // interrogative
const IRR = z.literal("Irr"); // irrealis
const JUS = z.literal("Jus"); // jussive; or injunctive
const NEC = z.literal("Nec"); // necessitative
const OPT = z.literal("Opt"); // optative
const POT = z.literal("Pot"); // potential
const PRP = z.literal("Prp"); // purposive
const QOT = z.literal("Qot"); // quotative
const SUB = z.literal("Sub"); // subjunctive; or conjunctive

// Source: https://universaldependencies.org/u/feat/Mood.html
export const MoodSchema = z.enum([
	ADM.value,
	CND.value,
	DES.value,
	IMP.value,
	IND.value,
	INT.value,
	IRR.value,
	JUS.value,
	NEC.value,
	OPT.value,
	POT.value,
	PRP.value,
	QOT.value,
	SUB.value,
]);
export const Mood = MoodSchema.enum;
export type Mood = z.infer<typeof MoodSchema>;
