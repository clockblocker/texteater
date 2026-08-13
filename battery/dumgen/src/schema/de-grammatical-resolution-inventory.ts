import type { LemmaFamilyFor, LemmaKindFor } from "dumling/types";

export type GermanGrammaticalRoute = {
	readonly [Family in LemmaFamilyFor<"de">]: {
		readonly family: Family;
		readonly kind: LemmaKindFor<"de", Family>;
	};
}[LemmaFamilyFor<"de">];

export const DE_ENABLED_GRAMMATICAL_RESOLUTION_ROUTES = [
	{ family: "Lexeme", kind: "ADJ" },
	{ family: "Lexeme", kind: "ADP" },
	{ family: "Lexeme", kind: "ADV" },
	{ family: "Lexeme", kind: "AUX" },
	{ family: "Lexeme", kind: "CCONJ" },
	{ family: "Lexeme", kind: "DET" },
	{ family: "Lexeme", kind: "INTJ" },
	{ family: "Lexeme", kind: "NOUN" },
	{ family: "Lexeme", kind: "NUM" },
	{ family: "Lexeme", kind: "PART" },
	{ family: "Lexeme", kind: "PRON" },
	{ family: "Lexeme", kind: "PROPN" },
	{ family: "Lexeme", kind: "SCONJ" },
	{ family: "Lexeme", kind: "SYM" },
	{ family: "Lexeme", kind: "VERB" },
	{ family: "Lexeme", kind: "X" },
	{ family: "Phraseme", kind: "Aphorism" },
	{ family: "Phraseme", kind: "DiscourseFormula" },
	{ family: "Phraseme", kind: "Idiom" },
	{ family: "Phraseme", kind: "Proverb" },
	{ family: "Construction", kind: "Fusion" },
	{ family: "Construction", kind: "PairedFrame" },
] as const satisfies readonly GermanGrammaticalRoute[];

export const DE_NOT_IMPLEMENTED_GRAMMATICAL_RESOLUTION_ROUTES = [
	{ family: "Lexeme", kind: "PUNCT" },
	{ family: "Phraseme", kind: "Collocation" },
	{ family: "Morpheme", kind: "Root" },
	{ family: "Morpheme", kind: "Prefix" },
	{ family: "Morpheme", kind: "Suffix" },
	{ family: "Morpheme", kind: "Suffixoid" },
	{ family: "Morpheme", kind: "Infix" },
	{ family: "Morpheme", kind: "Circumfix" },
	{ family: "Morpheme", kind: "Interfix" },
	{ family: "Morpheme", kind: "Transfix" },
	{ family: "Morpheme", kind: "Clitic" },
	{ family: "Morpheme", kind: "ToneMarking" },
	{ family: "Morpheme", kind: "Duplifix" },
] as const satisfies readonly GermanGrammaticalRoute[];
