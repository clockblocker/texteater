import { z } from "zod";

const ACC = z.literal("Acc"); // accusative
const ABE = z.literal("Abe"); // abessive; caritive | privative
const BEN = z.literal("Ben"); // benefactive; destinative
const CAU = z.literal("Cau"); // causative; motivative | purposive
const CMP = z.literal("Cmp"); // comparative
const CNS = z.literal("Cns"); // considerative
const COM = z.literal("Com"); // comitative; associative
const DAT = z.literal("Dat"); // dative
const DIS = z.literal("Dis"); // distributive
const EQU = z.literal("Equ"); // equative
const GEN = z.literal("Gen"); // genitive
const INS = z.literal("Ins"); // instrumental; instructive
const PAR = z.literal("Par"); // partitive
const TEM = z.literal("Tem"); // temporal
const ABL = z.literal("Abl"); // ablative; adelative
const ADD = z.literal("Add"); // additive
const ADE = z.literal("Ade"); // adessive
const ALL = z.literal("All"); // allative; adlative
const DEL = z.literal("Del"); // delative; superelative
const ELA = z.literal("Ela"); // elative; inelative
const ESS = z.literal("Ess"); // essive; prolative
const ILL = z.literal("Ill"); // illative; inlative
const INE = z.literal("Ine"); // inessive
const LAT = z.literal("Lat"); // lative; directional allative
const LOC = z.literal("Loc"); // locative
const NOM = z.literal("Nom"); // nominative
const PER = z.literal("Per"); // perlative
const SBE = z.literal("Sbe"); // subelative
const SBL = z.literal("Sbl"); // sublative
const SPL = z.literal("Spl"); // superlative
const SUB = z.literal("Sub"); // subessive
const SUP = z.literal("Sup"); // superessive
const TER = z.literal("Ter"); // terminative; terminal allative

// Source: https://universaldependencies.org/u/feat/Case.html
export const CaseSchema = z.enum([
	ACC.value,
	ABE.value,
	BEN.value,
	CAU.value,
	CMP.value,
	CNS.value,
	COM.value,
	DAT.value,
	DIS.value,
	EQU.value,
	GEN.value,
	INS.value,
	PAR.value,
	TEM.value,
	ABL.value,
	ADD.value,
	ADE.value,
	ALL.value,
	DEL.value,
	ELA.value,
	ESS.value,
	ILL.value,
	INE.value,
	LAT.value,
	LOC.value,
	NOM.value,
	PER.value,
	SBE.value,
	SBL.value,
	SPL.value,
	SUB.value,
	SUP.value,
	TER.value,
]);
export const Case = CaseSchema.enum;
export type Case = z.infer<typeof CaseSchema>;
