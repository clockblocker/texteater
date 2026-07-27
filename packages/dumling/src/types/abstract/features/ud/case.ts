import { z } from "zod/v3";

const caseValues = [
	"Acc", // accusative
	"Abe", // abessive; caritive | privative
	"Ben", // benefactive; destinative
	"Cau", // causative; motivative | purposive
	"Cmp", // comparative
	"Cns", // considerative
	"Com", // comitative; associative
	"Dat", // dative
	"Dis", // distributive
	"Equ", // equative
	"Gen", // genitive
	"Ins", // instrumental; instructive
	"Par", // partitive
	"Tem", // temporal
	"Abl", // ablative; adelative
	"Add", // additive
	"Ade", // adessive
	"All", // allative; adlative
	"Del", // delative; superelative
	"Ela", // elative; inelative
	"Ess", // essive; prolative
	"Ill", // illative; inlative
	"Ine", // inessive
	"Lat", // lative; directional allative
	"Loc", // locative
	"Nom", // nominative
	"Per", // perlative
	"Sbe", // subelative
	"Sbl", // sublative
	"Spl", // superlative
	"Sub", // subessive
	"Sup", // superessive
	"Ter", // terminative; terminal allative
] as const;

// Source: https://universaldependencies.org/u/feat/Case.html
export const Case = z.enum(caseValues);
export type Case = z.infer<typeof Case>;
