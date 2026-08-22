const verbFormValues = [
	"Conv", // converb; transgressive, adverbial participle, verbal adverb
	"Fin", // finite verb
	"Gdv", // gerundive
	"Ger", // gerund
	"Inf", // infinitive
	"Part", // participle; verbal adjective
	"Sup", // supine
	"Vnoun", // verbal noun; masdar
] as const;

// Source: https://universaldependencies.org/u/feat/VerbForm.html
export const VerbForm = verbFormValues;
export type VerbForm = (typeof VerbForm)[number];
