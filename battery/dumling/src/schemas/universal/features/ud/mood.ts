import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Mood.html
export const MoodSchema = z.enum([
	"Adm", // admirative
	"Cnd", // conditional
	"Des", // desiderative
	"Imp", // imperative
	"Ind", // indicative; or realis
	"Int", // interrogative
	"Irr", // irrealis
	"Jus", // jussive; or injunctive
	"Nec", // necessitative
	"Opt", // optative
	"Pot", // potential
	"Prp", // purposive
	"Qot", // quotative
	"Sub", // subjunctive; or conjunctive
]);
