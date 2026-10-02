import { z } from "zod";

export const MorphemeKindSchema = z.enum([
	"Root",
	"Prefix",
	"Suffix",
	"Suffixoid",
	"Infix",
	"Circumfix",
	"Interfix",
	"Transfix",
	"ToneMarking",
	"Duplifix",
]);
