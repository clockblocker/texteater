import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/VerbForm.html
export const VerbFormSchema = z.enum([
	"Conv", // converb; transgressive, adverbial participle, verbal adverb
	"Fin", // finite verb
	"Gdv", // gerundive
	"Ger", // gerund
	"Inf", // infinitive
	"Part", // participle; verbal adjective
	"Sup", // supine
	"Vnoun", // verbal noun; masdar
]);
