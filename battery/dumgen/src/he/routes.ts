/** Hebrew clickable routes supported by Dumling; no German inventories. */
import type { Route } from "../segment/segmented-sentence.js";

export const hebrewRoutes = [
	{ id: "Lexeme_ADJ", family: "Lexeme", kind: "ADJ" },
	{ id: "Lexeme_ADP", family: "Lexeme", kind: "ADP" },
	{ id: "Lexeme_ADV", family: "Lexeme", kind: "ADV" },
	{ id: "Lexeme_AUX", family: "Lexeme", kind: "AUX" },
	{ id: "Lexeme_CCONJ", family: "Lexeme", kind: "CCONJ" },
	{ id: "Lexeme_DET", family: "Lexeme", kind: "DET" },
	{ id: "Lexeme_INTJ", family: "Lexeme", kind: "INTJ" },
	{ id: "Lexeme_NOUN", family: "Lexeme", kind: "NOUN" },
	{ id: "Lexeme_NUM", family: "Lexeme", kind: "NUM" },
	{ id: "Lexeme_PART", family: "Lexeme", kind: "PART" },
	{ id: "Lexeme_PRON", family: "Lexeme", kind: "PRON" },
	{ id: "Lexeme_PROPN", family: "Lexeme", kind: "PROPN" },
	{ id: "Lexeme_SCONJ", family: "Lexeme", kind: "SCONJ" },
	{ id: "Lexeme_SYM", family: "Lexeme", kind: "SYM" },
	{ id: "Lexeme_VERB", family: "Lexeme", kind: "VERB" },
	{ id: "Locution_ADV", family: "Locution", kind: "ADV" },
	{ id: "Locution_INTJ", family: "Locution", kind: "INTJ" },
	{ id: "Saying_Saying", family: "Saying", kind: "Saying" },
	{ id: "Foreign_Foreign", family: "Foreign", kind: "Foreign" },
] as const;

export function hebrewRoute(id: string): Route<"he"> | undefined {
	const found = hebrewRoutes.find((route) => route.id === id);
	if (!found) return undefined;
	const { id: _id, ...route } = found;
	return { language: "he", ...route };
}
