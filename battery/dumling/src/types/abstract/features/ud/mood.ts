import { z } from "zod/v3";

const moodValues = [
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
] as const;

// Source: https://universaldependencies.org/u/feat/Mood.html
export const Mood = z.enum(moodValues);
export type Mood = z.infer<typeof Mood>;
