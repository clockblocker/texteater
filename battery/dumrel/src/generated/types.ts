// Generated from canonical Dumrel Zod schemas. Run bun run generate.
import type * as Dumling from "dumling/types";
export type KnowledgeSettings = {
	transcription?: boolean | undefined;
	definition?: boolean | undefined;
	morphologicalTree?: boolean | undefined;
	lexicalBreakdown?: boolean | undefined;
	valency?: boolean | undefined;
	translations?:
		| { en?: boolean | undefined; ru?: boolean | undefined }
		| undefined;
	semanticRelations?:
		| {
				synonym?: boolean | undefined;
				nearSynonym?: boolean | undefined;
				antonym?: boolean | undefined;
				nearAntonym?: boolean | undefined;
				hypernym?: boolean | undefined;
				hyponym?: boolean | undefined;
				meronym?: boolean | undefined;
				holonym?: boolean | undefined;
		  }
		| undefined;
};
export type KnowledgeRequestMask = {
	transcription?: null | undefined;
	definition?: null | undefined;
	morphologicalTree?: null | undefined;
	lexicalBreakdown?: null | undefined;
	valency?: null | undefined;
	translations?: { en?: null | undefined; ru?: null | undefined } | undefined;
	semanticRelations?:
		| {
				synonym?: null | undefined;
				nearSynonym?: null | undefined;
				antonym?: null | undefined;
				nearAntonym?: null | undefined;
				hypernym?: null | undefined;
				hyponym?: null | undefined;
				meronym?: null | undefined;
				holonym?: null | undefined;
		  }
		| undefined;
};
export type KnowledgeSelectionInput = {
	route:
		| { language: "de"; family: "Lexeme"; kind: "ADJ" }
		| { language: "de"; family: "Lexeme"; kind: "ADP" }
		| { language: "de"; family: "Lexeme"; kind: "ADV" }
		| { language: "de"; family: "Lexeme"; kind: "AUX" }
		| { language: "de"; family: "Lexeme"; kind: "CCONJ" }
		| { language: "de"; family: "Lexeme"; kind: "DET" }
		| { language: "de"; family: "Lexeme"; kind: "INTJ" }
		| { language: "de"; family: "Lexeme"; kind: "NOUN" }
		| { language: "de"; family: "Lexeme"; kind: "NUM" }
		| { language: "de"; family: "Lexeme"; kind: "X" }
		| { language: "de"; family: "Lexeme"; kind: "PART" }
		| { language: "de"; family: "Lexeme"; kind: "PRON" }
		| { language: "de"; family: "Lexeme"; kind: "PROPN" }
		| { language: "de"; family: "Lexeme"; kind: "PUNCT" }
		| { language: "de"; family: "Lexeme"; kind: "SCONJ" }
		| { language: "de"; family: "Lexeme"; kind: "SYM" }
		| { language: "de"; family: "Lexeme"; kind: "VERB" }
		| { language: "de"; family: "Morpheme"; kind: "Circumfix" }
		| { language: "de"; family: "Morpheme"; kind: "Clitic" }
		| { language: "de"; family: "Morpheme"; kind: "Duplifix" }
		| { language: "de"; family: "Morpheme"; kind: "Infix" }
		| { language: "de"; family: "Morpheme"; kind: "Interfix" }
		| { language: "de"; family: "Morpheme"; kind: "Prefix" }
		| { language: "de"; family: "Morpheme"; kind: "Root" }
		| { language: "de"; family: "Morpheme"; kind: "Suffix" }
		| { language: "de"; family: "Morpheme"; kind: "Suffixoid" }
		| { language: "de"; family: "Morpheme"; kind: "Transfix" }
		| { language: "de"; family: "Phraseme"; kind: "Aphorism" }
		| { language: "de"; family: "Phraseme"; kind: "Collocation" }
		| { language: "de"; family: "Phraseme"; kind: "DiscourseFormula" }
		| { language: "de"; family: "Phraseme"; kind: "Idiom" }
		| { language: "de"; family: "Phraseme"; kind: "Proverb" }
		| { language: "en"; family: "Lexeme"; kind: "ADJ" }
		| { language: "en"; family: "Lexeme"; kind: "ADP" }
		| { language: "en"; family: "Lexeme"; kind: "ADV" }
		| { language: "en"; family: "Lexeme"; kind: "AUX" }
		| { language: "en"; family: "Lexeme"; kind: "CCONJ" }
		| { language: "en"; family: "Lexeme"; kind: "DET" }
		| { language: "en"; family: "Lexeme"; kind: "INTJ" }
		| { language: "en"; family: "Lexeme"; kind: "NOUN" }
		| { language: "en"; family: "Lexeme"; kind: "NUM" }
		| { language: "en"; family: "Lexeme"; kind: "X" }
		| { language: "en"; family: "Lexeme"; kind: "PART" }
		| { language: "en"; family: "Lexeme"; kind: "PRON" }
		| { language: "en"; family: "Lexeme"; kind: "PROPN" }
		| { language: "en"; family: "Lexeme"; kind: "PUNCT" }
		| { language: "en"; family: "Lexeme"; kind: "SCONJ" }
		| { language: "en"; family: "Lexeme"; kind: "SYM" }
		| { language: "en"; family: "Lexeme"; kind: "VERB" }
		| { language: "en"; family: "Morpheme"; kind: "Circumfix" }
		| { language: "en"; family: "Morpheme"; kind: "Clitic" }
		| { language: "en"; family: "Morpheme"; kind: "Duplifix" }
		| { language: "en"; family: "Morpheme"; kind: "Infix" }
		| { language: "en"; family: "Morpheme"; kind: "Interfix" }
		| { language: "en"; family: "Morpheme"; kind: "Prefix" }
		| { language: "en"; family: "Morpheme"; kind: "Root" }
		| { language: "en"; family: "Morpheme"; kind: "Suffix" }
		| { language: "en"; family: "Morpheme"; kind: "Suffixoid" }
		| { language: "en"; family: "Morpheme"; kind: "ToneMarking" }
		| { language: "en"; family: "Morpheme"; kind: "Transfix" }
		| { language: "en"; family: "Phraseme"; kind: "Aphorism" }
		| { language: "en"; family: "Phraseme"; kind: "DiscourseFormula" }
		| { language: "en"; family: "Phraseme"; kind: "Idiom" }
		| { language: "en"; family: "Phraseme"; kind: "Proverb" }
		| { language: "he"; family: "Lexeme"; kind: "ADJ" }
		| { language: "he"; family: "Lexeme"; kind: "ADP" }
		| { language: "he"; family: "Lexeme"; kind: "ADV" }
		| { language: "he"; family: "Lexeme"; kind: "AUX" }
		| { language: "he"; family: "Lexeme"; kind: "CCONJ" }
		| { language: "he"; family: "Lexeme"; kind: "DET" }
		| { language: "he"; family: "Lexeme"; kind: "INTJ" }
		| { language: "he"; family: "Lexeme"; kind: "NOUN" }
		| { language: "he"; family: "Lexeme"; kind: "NUM" }
		| { language: "he"; family: "Lexeme"; kind: "X" }
		| { language: "he"; family: "Lexeme"; kind: "PART" }
		| { language: "he"; family: "Lexeme"; kind: "PRON" }
		| { language: "he"; family: "Lexeme"; kind: "PROPN" }
		| { language: "he"; family: "Lexeme"; kind: "PUNCT" }
		| { language: "he"; family: "Lexeme"; kind: "SCONJ" }
		| { language: "he"; family: "Lexeme"; kind: "SYM" }
		| { language: "he"; family: "Lexeme"; kind: "VERB" }
		| { language: "he"; family: "Morpheme"; kind: "Circumfix" }
		| { language: "he"; family: "Morpheme"; kind: "Clitic" }
		| { language: "he"; family: "Morpheme"; kind: "Duplifix" }
		| { language: "he"; family: "Morpheme"; kind: "Infix" }
		| { language: "he"; family: "Morpheme"; kind: "Interfix" }
		| { language: "he"; family: "Morpheme"; kind: "Prefix" }
		| { language: "he"; family: "Morpheme"; kind: "Root" }
		| { language: "he"; family: "Morpheme"; kind: "Suffix" }
		| { language: "he"; family: "Morpheme"; kind: "Suffixoid" }
		| { language: "he"; family: "Morpheme"; kind: "ToneMarking" }
		| { language: "he"; family: "Morpheme"; kind: "Transfix" }
		| { language: "he"; family: "Phraseme"; kind: "Aphorism" }
		| { language: "he"; family: "Phraseme"; kind: "DiscourseFormula" }
		| { language: "he"; family: "Phraseme"; kind: "Idiom" }
		| { language: "he"; family: "Phraseme"; kind: "Proverb" };
	settings?: KnowledgeSettings | undefined;
};
export type DirectSemanticRelation =
	| "synonym"
	| "nearSynonym"
	| "antonym"
	| "nearAntonym"
	| "hypernym"
	| "holonym";
export type TranslationLanguage = "en" | "ru";
export type UnitShadow =
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "ADJ" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "ADP" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "ADV" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "AUX" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "CCONJ" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "DET" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "INTJ" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "NOUN" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "NUM" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "X" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "PART" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "PRON" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "PROPN" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "PUNCT" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "SCONJ" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "SYM" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "VERB" }
	| {
			language: "de";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Circumfix";
	  }
	| {
			language: "de";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Clitic";
	  }
	| {
			language: "de";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Duplifix";
	  }
	| {
			language: "de";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Infix";
	  }
	| {
			language: "de";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Interfix";
	  }
	| {
			language: "de";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Prefix";
	  }
	| {
			language: "de";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Root";
	  }
	| {
			language: "de";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Suffix";
	  }
	| {
			language: "de";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Suffixoid";
	  }
	| {
			language: "de";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Transfix";
	  }
	| {
			language: "de";
			canonicalForm: string;
			family: "Phraseme";
			kind: "Aphorism";
	  }
	| {
			language: "de";
			canonicalForm: string;
			family: "Phraseme";
			kind: "Collocation";
	  }
	| {
			language: "de";
			canonicalForm: string;
			family: "Phraseme";
			kind: "DiscourseFormula";
	  }
	| {
			language: "de";
			canonicalForm: string;
			family: "Phraseme";
			kind: "Idiom";
	  }
	| {
			language: "de";
			canonicalForm: string;
			family: "Phraseme";
			kind: "Proverb";
	  }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "ADJ" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "ADP" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "ADV" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "AUX" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "CCONJ" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "DET" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "INTJ" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "NOUN" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "NUM" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "X" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "PART" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "PRON" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "PROPN" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "PUNCT" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "SCONJ" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "SYM" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "VERB" }
	| {
			language: "en";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Circumfix";
	  }
	| {
			language: "en";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Clitic";
	  }
	| {
			language: "en";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Duplifix";
	  }
	| {
			language: "en";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Infix";
	  }
	| {
			language: "en";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Interfix";
	  }
	| {
			language: "en";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Prefix";
	  }
	| {
			language: "en";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Root";
	  }
	| {
			language: "en";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Suffix";
	  }
	| {
			language: "en";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Suffixoid";
	  }
	| {
			language: "en";
			canonicalForm: string;
			family: "Morpheme";
			kind: "ToneMarking";
	  }
	| {
			language: "en";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Transfix";
	  }
	| {
			language: "en";
			canonicalForm: string;
			family: "Phraseme";
			kind: "Aphorism";
	  }
	| {
			language: "en";
			canonicalForm: string;
			family: "Phraseme";
			kind: "DiscourseFormula";
	  }
	| {
			language: "en";
			canonicalForm: string;
			family: "Phraseme";
			kind: "Idiom";
	  }
	| {
			language: "en";
			canonicalForm: string;
			family: "Phraseme";
			kind: "Proverb";
	  }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "ADJ" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "ADP" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "ADV" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "AUX" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "CCONJ" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "DET" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "INTJ" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "NOUN" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "NUM" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "X" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "PART" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "PRON" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "PROPN" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "PUNCT" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "SCONJ" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "SYM" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "VERB" }
	| {
			language: "he";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Circumfix";
	  }
	| {
			language: "he";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Clitic";
	  }
	| {
			language: "he";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Duplifix";
	  }
	| {
			language: "he";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Infix";
	  }
	| {
			language: "he";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Interfix";
	  }
	| {
			language: "he";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Prefix";
	  }
	| {
			language: "he";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Root";
	  }
	| {
			language: "he";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Suffix";
	  }
	| {
			language: "he";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Suffixoid";
	  }
	| {
			language: "he";
			canonicalForm: string;
			family: "Morpheme";
			kind: "ToneMarking";
	  }
	| {
			language: "he";
			canonicalForm: string;
			family: "Morpheme";
			kind: "Transfix";
	  }
	| {
			language: "he";
			canonicalForm: string;
			family: "Phraseme";
			kind: "Aphorism";
	  }
	| {
			language: "he";
			canonicalForm: string;
			family: "Phraseme";
			kind: "DiscourseFormula";
	  }
	| {
			language: "he";
			canonicalForm: string;
			family: "Phraseme";
			kind: "Idiom";
	  }
	| {
			language: "he";
			canonicalForm: string;
			family: "Phraseme";
			kind: "Proverb";
	  };
export type LexemeUnitShadow =
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "ADJ" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "ADP" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "ADV" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "AUX" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "CCONJ" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "DET" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "INTJ" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "NOUN" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "NUM" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "X" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "PART" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "PRON" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "PROPN" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "PUNCT" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "SCONJ" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "SYM" }
	| { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "VERB" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "ADJ" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "ADP" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "ADV" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "AUX" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "CCONJ" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "DET" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "INTJ" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "NOUN" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "NUM" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "X" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "PART" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "PRON" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "PROPN" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "PUNCT" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "SCONJ" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "SYM" }
	| { language: "en"; canonicalForm: string; family: "Lexeme"; kind: "VERB" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "ADJ" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "ADP" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "ADV" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "AUX" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "CCONJ" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "DET" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "INTJ" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "NOUN" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "NUM" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "X" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "PART" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "PRON" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "PROPN" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "PUNCT" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "SCONJ" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "SYM" }
	| { language: "he"; canonicalForm: string; family: "Lexeme"; kind: "VERB" };
export type LexicalBreakdown = [
	LexemeUnitShadow,
	LexemeUnitShadow,
	...Array<LexemeUnitShadow>,
];
export type MorphologicalTree = {
	root: { nodeKind: "structure"; children: Array<MorphologicalTreeNode> };
};
export type MorphologicalTreeNode =
	| {
			nodeKind: "morphemeReading";
			reading:
				| Dumling.Reading<"de", "Morpheme", "Circumfix">
				| Dumling.Reading<"de", "Morpheme", "Clitic">
				| Dumling.Reading<"de", "Morpheme", "Duplifix">
				| Dumling.Reading<"de", "Morpheme", "Infix">
				| Dumling.Reading<"de", "Morpheme", "Interfix">
				| Dumling.Reading<"de", "Morpheme", "Prefix">
				| Dumling.Reading<"de", "Morpheme", "Root">
				| Dumling.Reading<"de", "Morpheme", "Suffix">
				| Dumling.Reading<"de", "Morpheme", "Suffixoid">
				| Dumling.Reading<"de", "Morpheme", "Transfix">
				| Dumling.Reading<"en", "Morpheme", "Circumfix">
				| Dumling.Reading<"en", "Morpheme", "Clitic">
				| Dumling.Reading<"en", "Morpheme", "Duplifix">
				| Dumling.Reading<"en", "Morpheme", "Infix">
				| Dumling.Reading<"en", "Morpheme", "Interfix">
				| Dumling.Reading<"en", "Morpheme", "Prefix">
				| Dumling.Reading<"en", "Morpheme", "Root">
				| Dumling.Reading<"en", "Morpheme", "Suffix">
				| Dumling.Reading<"en", "Morpheme", "Suffixoid">
				| Dumling.Reading<"en", "Morpheme", "ToneMarking">
				| Dumling.Reading<"en", "Morpheme", "Transfix">
				| Dumling.Reading<"he", "Morpheme", "Circumfix">
				| Dumling.Reading<"he", "Morpheme", "Clitic">
				| Dumling.Reading<"he", "Morpheme", "Duplifix">
				| Dumling.Reading<"he", "Morpheme", "Infix">
				| Dumling.Reading<"he", "Morpheme", "Interfix">
				| Dumling.Reading<"he", "Morpheme", "Prefix">
				| Dumling.Reading<"he", "Morpheme", "Root">
				| Dumling.Reading<"he", "Morpheme", "Suffix">
				| Dumling.Reading<"he", "Morpheme", "Suffixoid">
				| Dumling.Reading<"he", "Morpheme", "ToneMarking">
				| Dumling.Reading<"he", "Morpheme", "Transfix">;
	  }
	| {
			nodeKind: "unitShadow";
			unitShadow:
				| {
						language: "de";
						canonicalForm: string;
						family: "Lexeme";
						kind: "ADJ";
				  }
				| {
						language: "de";
						canonicalForm: string;
						family: "Lexeme";
						kind: "ADP";
				  }
				| {
						language: "de";
						canonicalForm: string;
						family: "Lexeme";
						kind: "ADV";
				  }
				| {
						language: "de";
						canonicalForm: string;
						family: "Lexeme";
						kind: "AUX";
				  }
				| {
						language: "de";
						canonicalForm: string;
						family: "Lexeme";
						kind: "CCONJ";
				  }
				| {
						language: "de";
						canonicalForm: string;
						family: "Lexeme";
						kind: "DET";
				  }
				| {
						language: "de";
						canonicalForm: string;
						family: "Lexeme";
						kind: "INTJ";
				  }
				| {
						language: "de";
						canonicalForm: string;
						family: "Lexeme";
						kind: "NOUN";
				  }
				| {
						language: "de";
						canonicalForm: string;
						family: "Lexeme";
						kind: "NUM";
				  }
				| {
						language: "de";
						canonicalForm: string;
						family: "Lexeme";
						kind: "X";
				  }
				| {
						language: "de";
						canonicalForm: string;
						family: "Lexeme";
						kind: "PART";
				  }
				| {
						language: "de";
						canonicalForm: string;
						family: "Lexeme";
						kind: "PRON";
				  }
				| {
						language: "de";
						canonicalForm: string;
						family: "Lexeme";
						kind: "PROPN";
				  }
				| {
						language: "de";
						canonicalForm: string;
						family: "Lexeme";
						kind: "PUNCT";
				  }
				| {
						language: "de";
						canonicalForm: string;
						family: "Lexeme";
						kind: "SCONJ";
				  }
				| {
						language: "de";
						canonicalForm: string;
						family: "Lexeme";
						kind: "SYM";
				  }
				| {
						language: "de";
						canonicalForm: string;
						family: "Lexeme";
						kind: "VERB";
				  }
				| {
						language: "de";
						canonicalForm: string;
						family: "Phraseme";
						kind: "Aphorism";
				  }
				| {
						language: "de";
						canonicalForm: string;
						family: "Phraseme";
						kind: "Collocation";
				  }
				| {
						language: "de";
						canonicalForm: string;
						family: "Phraseme";
						kind: "DiscourseFormula";
				  }
				| {
						language: "de";
						canonicalForm: string;
						family: "Phraseme";
						kind: "Idiom";
				  }
				| {
						language: "de";
						canonicalForm: string;
						family: "Phraseme";
						kind: "Proverb";
				  }
				| {
						language: "en";
						canonicalForm: string;
						family: "Lexeme";
						kind: "ADJ";
				  }
				| {
						language: "en";
						canonicalForm: string;
						family: "Lexeme";
						kind: "ADP";
				  }
				| {
						language: "en";
						canonicalForm: string;
						family: "Lexeme";
						kind: "ADV";
				  }
				| {
						language: "en";
						canonicalForm: string;
						family: "Lexeme";
						kind: "AUX";
				  }
				| {
						language: "en";
						canonicalForm: string;
						family: "Lexeme";
						kind: "CCONJ";
				  }
				| {
						language: "en";
						canonicalForm: string;
						family: "Lexeme";
						kind: "DET";
				  }
				| {
						language: "en";
						canonicalForm: string;
						family: "Lexeme";
						kind: "INTJ";
				  }
				| {
						language: "en";
						canonicalForm: string;
						family: "Lexeme";
						kind: "NOUN";
				  }
				| {
						language: "en";
						canonicalForm: string;
						family: "Lexeme";
						kind: "NUM";
				  }
				| {
						language: "en";
						canonicalForm: string;
						family: "Lexeme";
						kind: "X";
				  }
				| {
						language: "en";
						canonicalForm: string;
						family: "Lexeme";
						kind: "PART";
				  }
				| {
						language: "en";
						canonicalForm: string;
						family: "Lexeme";
						kind: "PRON";
				  }
				| {
						language: "en";
						canonicalForm: string;
						family: "Lexeme";
						kind: "PROPN";
				  }
				| {
						language: "en";
						canonicalForm: string;
						family: "Lexeme";
						kind: "PUNCT";
				  }
				| {
						language: "en";
						canonicalForm: string;
						family: "Lexeme";
						kind: "SCONJ";
				  }
				| {
						language: "en";
						canonicalForm: string;
						family: "Lexeme";
						kind: "SYM";
				  }
				| {
						language: "en";
						canonicalForm: string;
						family: "Lexeme";
						kind: "VERB";
				  }
				| {
						language: "en";
						canonicalForm: string;
						family: "Phraseme";
						kind: "Aphorism";
				  }
				| {
						language: "en";
						canonicalForm: string;
						family: "Phraseme";
						kind: "DiscourseFormula";
				  }
				| {
						language: "en";
						canonicalForm: string;
						family: "Phraseme";
						kind: "Idiom";
				  }
				| {
						language: "en";
						canonicalForm: string;
						family: "Phraseme";
						kind: "Proverb";
				  }
				| {
						language: "he";
						canonicalForm: string;
						family: "Lexeme";
						kind: "ADJ";
				  }
				| {
						language: "he";
						canonicalForm: string;
						family: "Lexeme";
						kind: "ADP";
				  }
				| {
						language: "he";
						canonicalForm: string;
						family: "Lexeme";
						kind: "ADV";
				  }
				| {
						language: "he";
						canonicalForm: string;
						family: "Lexeme";
						kind: "AUX";
				  }
				| {
						language: "he";
						canonicalForm: string;
						family: "Lexeme";
						kind: "CCONJ";
				  }
				| {
						language: "he";
						canonicalForm: string;
						family: "Lexeme";
						kind: "DET";
				  }
				| {
						language: "he";
						canonicalForm: string;
						family: "Lexeme";
						kind: "INTJ";
				  }
				| {
						language: "he";
						canonicalForm: string;
						family: "Lexeme";
						kind: "NOUN";
				  }
				| {
						language: "he";
						canonicalForm: string;
						family: "Lexeme";
						kind: "NUM";
				  }
				| {
						language: "he";
						canonicalForm: string;
						family: "Lexeme";
						kind: "X";
				  }
				| {
						language: "he";
						canonicalForm: string;
						family: "Lexeme";
						kind: "PART";
				  }
				| {
						language: "he";
						canonicalForm: string;
						family: "Lexeme";
						kind: "PRON";
				  }
				| {
						language: "he";
						canonicalForm: string;
						family: "Lexeme";
						kind: "PROPN";
				  }
				| {
						language: "he";
						canonicalForm: string;
						family: "Lexeme";
						kind: "PUNCT";
				  }
				| {
						language: "he";
						canonicalForm: string;
						family: "Lexeme";
						kind: "SCONJ";
				  }
				| {
						language: "he";
						canonicalForm: string;
						family: "Lexeme";
						kind: "SYM";
				  }
				| {
						language: "he";
						canonicalForm: string;
						family: "Lexeme";
						kind: "VERB";
				  }
				| {
						language: "he";
						canonicalForm: string;
						family: "Phraseme";
						kind: "Aphorism";
				  }
				| {
						language: "he";
						canonicalForm: string;
						family: "Phraseme";
						kind: "DiscourseFormula";
				  }
				| {
						language: "he";
						canonicalForm: string;
						family: "Phraseme";
						kind: "Idiom";
				  }
				| {
						language: "he";
						canonicalForm: string;
						family: "Phraseme";
						kind: "Proverb";
				  };
	  }
	| { nodeKind: "structure"; children: Array<MorphologicalTreeNode> };
export type PendingSemanticRelation = {
	relation: DirectSemanticRelation;
	target: UnitShadow;
};
export type SemanticRelations =
	| {
			targetKind: "reading";
			synonym?:
				| Array<
						| Dumling.Reading<"de", "Lexeme", "ADJ">
						| Dumling.Reading<"de", "Lexeme", "ADP">
						| Dumling.Reading<"de", "Lexeme", "ADV">
						| Dumling.Reading<"de", "Lexeme", "AUX">
						| Dumling.Reading<"de", "Lexeme", "CCONJ">
						| Dumling.Reading<"de", "Lexeme", "DET">
						| Dumling.Reading<"de", "Lexeme", "INTJ">
						| Dumling.Reading<"de", "Lexeme", "NOUN">
						| Dumling.Reading<"de", "Lexeme", "NUM">
						| Dumling.Reading<"de", "Lexeme", "X">
						| Dumling.Reading<"de", "Lexeme", "PART">
						| Dumling.Reading<"de", "Lexeme", "PRON">
						| Dumling.Reading<"de", "Lexeme", "PROPN">
						| Dumling.Reading<"de", "Lexeme", "PUNCT">
						| Dumling.Reading<"de", "Lexeme", "SCONJ">
						| Dumling.Reading<"de", "Lexeme", "SYM">
						| Dumling.Reading<"de", "Lexeme", "VERB">
						| Dumling.Reading<"de", "Morpheme", "Circumfix">
						| Dumling.Reading<"de", "Morpheme", "Clitic">
						| Dumling.Reading<"de", "Morpheme", "Duplifix">
						| Dumling.Reading<"de", "Morpheme", "Infix">
						| Dumling.Reading<"de", "Morpheme", "Interfix">
						| Dumling.Reading<"de", "Morpheme", "Prefix">
						| Dumling.Reading<"de", "Morpheme", "Root">
						| Dumling.Reading<"de", "Morpheme", "Suffix">
						| Dumling.Reading<"de", "Morpheme", "Suffixoid">
						| Dumling.Reading<"de", "Morpheme", "Transfix">
						| Dumling.Reading<"de", "Phraseme", "Aphorism">
						| Dumling.Reading<"de", "Phraseme", "Collocation">
						| Dumling.Reading<"de", "Phraseme", "DiscourseFormula">
						| Dumling.Reading<"de", "Phraseme", "Idiom">
						| Dumling.Reading<"de", "Phraseme", "Proverb">
						| Dumling.Reading<"en", "Lexeme", "ADJ">
						| Dumling.Reading<"en", "Lexeme", "ADP">
						| Dumling.Reading<"en", "Lexeme", "ADV">
						| Dumling.Reading<"en", "Lexeme", "AUX">
						| Dumling.Reading<"en", "Lexeme", "CCONJ">
						| Dumling.Reading<"en", "Lexeme", "DET">
						| Dumling.Reading<"en", "Lexeme", "INTJ">
						| Dumling.Reading<"en", "Lexeme", "NOUN">
						| Dumling.Reading<"en", "Lexeme", "NUM">
						| Dumling.Reading<"en", "Lexeme", "X">
						| Dumling.Reading<"en", "Lexeme", "PART">
						| Dumling.Reading<"en", "Lexeme", "PRON">
						| Dumling.Reading<"en", "Lexeme", "PROPN">
						| Dumling.Reading<"en", "Lexeme", "PUNCT">
						| Dumling.Reading<"en", "Lexeme", "SCONJ">
						| Dumling.Reading<"en", "Lexeme", "SYM">
						| Dumling.Reading<"en", "Lexeme", "VERB">
						| Dumling.Reading<"en", "Morpheme", "Circumfix">
						| Dumling.Reading<"en", "Morpheme", "Clitic">
						| Dumling.Reading<"en", "Morpheme", "Duplifix">
						| Dumling.Reading<"en", "Morpheme", "Infix">
						| Dumling.Reading<"en", "Morpheme", "Interfix">
						| Dumling.Reading<"en", "Morpheme", "Prefix">
						| Dumling.Reading<"en", "Morpheme", "Root">
						| Dumling.Reading<"en", "Morpheme", "Suffix">
						| Dumling.Reading<"en", "Morpheme", "Suffixoid">
						| Dumling.Reading<"en", "Morpheme", "ToneMarking">
						| Dumling.Reading<"en", "Morpheme", "Transfix">
						| Dumling.Reading<"en", "Phraseme", "Aphorism">
						| Dumling.Reading<"en", "Phraseme", "DiscourseFormula">
						| Dumling.Reading<"en", "Phraseme", "Idiom">
						| Dumling.Reading<"en", "Phraseme", "Proverb">
						| Dumling.Reading<"he", "Lexeme", "ADJ">
						| Dumling.Reading<"he", "Lexeme", "ADP">
						| Dumling.Reading<"he", "Lexeme", "ADV">
						| Dumling.Reading<"he", "Lexeme", "AUX">
						| Dumling.Reading<"he", "Lexeme", "CCONJ">
						| Dumling.Reading<"he", "Lexeme", "DET">
						| Dumling.Reading<"he", "Lexeme", "INTJ">
						| Dumling.Reading<"he", "Lexeme", "NOUN">
						| Dumling.Reading<"he", "Lexeme", "NUM">
						| Dumling.Reading<"he", "Lexeme", "X">
						| Dumling.Reading<"he", "Lexeme", "PART">
						| Dumling.Reading<"he", "Lexeme", "PRON">
						| Dumling.Reading<"he", "Lexeme", "PROPN">
						| Dumling.Reading<"he", "Lexeme", "PUNCT">
						| Dumling.Reading<"he", "Lexeme", "SCONJ">
						| Dumling.Reading<"he", "Lexeme", "SYM">
						| Dumling.Reading<"he", "Lexeme", "VERB">
						| Dumling.Reading<"he", "Morpheme", "Circumfix">
						| Dumling.Reading<"he", "Morpheme", "Clitic">
						| Dumling.Reading<"he", "Morpheme", "Duplifix">
						| Dumling.Reading<"he", "Morpheme", "Infix">
						| Dumling.Reading<"he", "Morpheme", "Interfix">
						| Dumling.Reading<"he", "Morpheme", "Prefix">
						| Dumling.Reading<"he", "Morpheme", "Root">
						| Dumling.Reading<"he", "Morpheme", "Suffix">
						| Dumling.Reading<"he", "Morpheme", "Suffixoid">
						| Dumling.Reading<"he", "Morpheme", "ToneMarking">
						| Dumling.Reading<"he", "Morpheme", "Transfix">
						| Dumling.Reading<"he", "Phraseme", "Aphorism">
						| Dumling.Reading<"he", "Phraseme", "DiscourseFormula">
						| Dumling.Reading<"he", "Phraseme", "Idiom">
						| Dumling.Reading<"he", "Phraseme", "Proverb">
				  >
				| undefined;
	  }
	| {
			targetKind?: "lemma" | undefined;
			synonym?:
				| Array<
						| Dumling.Lemma<"de", "Lexeme", "ADJ">
						| Dumling.Lemma<"de", "Lexeme", "ADP">
						| Dumling.Lemma<"de", "Lexeme", "ADV">
						| Dumling.Lemma<"de", "Lexeme", "AUX">
						| Dumling.Lemma<"de", "Lexeme", "CCONJ">
						| Dumling.Lemma<"de", "Lexeme", "DET">
						| Dumling.Lemma<"de", "Lexeme", "INTJ">
						| Dumling.Lemma<"de", "Lexeme", "NOUN">
						| Dumling.Lemma<"de", "Lexeme", "NUM">
						| Dumling.Lemma<"de", "Lexeme", "X">
						| Dumling.Lemma<"de", "Lexeme", "PART">
						| Dumling.Lemma<"de", "Lexeme", "PRON">
						| Dumling.Lemma<"de", "Lexeme", "PROPN">
						| Dumling.Lemma<"de", "Lexeme", "PUNCT">
						| Dumling.Lemma<"de", "Lexeme", "SCONJ">
						| Dumling.Lemma<"de", "Lexeme", "SYM">
						| Dumling.Lemma<"de", "Lexeme", "VERB">
						| Dumling.Lemma<"de", "Morpheme", "Circumfix">
						| Dumling.Lemma<"de", "Morpheme", "Clitic">
						| Dumling.Lemma<"de", "Morpheme", "Duplifix">
						| Dumling.Lemma<"de", "Morpheme", "Infix">
						| Dumling.Lemma<"de", "Morpheme", "Interfix">
						| Dumling.Lemma<"de", "Morpheme", "Prefix">
						| Dumling.Lemma<"de", "Morpheme", "Root">
						| Dumling.Lemma<"de", "Morpheme", "Suffix">
						| Dumling.Lemma<"de", "Morpheme", "Suffixoid">
						| Dumling.Lemma<"de", "Morpheme", "Transfix">
						| Dumling.Lemma<"de", "Phraseme", "Aphorism">
						| Dumling.Lemma<"de", "Phraseme", "Collocation">
						| Dumling.Lemma<"de", "Phraseme", "DiscourseFormula">
						| Dumling.Lemma<"de", "Phraseme", "Idiom">
						| Dumling.Lemma<"de", "Phraseme", "Proverb">
						| Dumling.Lemma<"en", "Lexeme", "ADJ">
						| Dumling.Lemma<"en", "Lexeme", "ADP">
						| Dumling.Lemma<"en", "Lexeme", "ADV">
						| Dumling.Lemma<"en", "Lexeme", "AUX">
						| Dumling.Lemma<"en", "Lexeme", "CCONJ">
						| Dumling.Lemma<"en", "Lexeme", "DET">
						| Dumling.Lemma<"en", "Lexeme", "INTJ">
						| Dumling.Lemma<"en", "Lexeme", "NOUN">
						| Dumling.Lemma<"en", "Lexeme", "NUM">
						| Dumling.Lemma<"en", "Lexeme", "X">
						| Dumling.Lemma<"en", "Lexeme", "PART">
						| Dumling.Lemma<"en", "Lexeme", "PRON">
						| Dumling.Lemma<"en", "Lexeme", "PROPN">
						| Dumling.Lemma<"en", "Lexeme", "PUNCT">
						| Dumling.Lemma<"en", "Lexeme", "SCONJ">
						| Dumling.Lemma<"en", "Lexeme", "SYM">
						| Dumling.Lemma<"en", "Lexeme", "VERB">
						| Dumling.Lemma<"en", "Morpheme", "Circumfix">
						| Dumling.Lemma<"en", "Morpheme", "Clitic">
						| Dumling.Lemma<"en", "Morpheme", "Duplifix">
						| Dumling.Lemma<"en", "Morpheme", "Infix">
						| Dumling.Lemma<"en", "Morpheme", "Interfix">
						| Dumling.Lemma<"en", "Morpheme", "Prefix">
						| Dumling.Lemma<"en", "Morpheme", "Root">
						| Dumling.Lemma<"en", "Morpheme", "Suffix">
						| Dumling.Lemma<"en", "Morpheme", "Suffixoid">
						| Dumling.Lemma<"en", "Morpheme", "ToneMarking">
						| Dumling.Lemma<"en", "Morpheme", "Transfix">
						| Dumling.Lemma<"en", "Phraseme", "Aphorism">
						| Dumling.Lemma<"en", "Phraseme", "DiscourseFormula">
						| Dumling.Lemma<"en", "Phraseme", "Idiom">
						| Dumling.Lemma<"en", "Phraseme", "Proverb">
						| Dumling.Lemma<"he", "Lexeme", "ADJ">
						| Dumling.Lemma<"he", "Lexeme", "ADP">
						| Dumling.Lemma<"he", "Lexeme", "ADV">
						| Dumling.Lemma<"he", "Lexeme", "AUX">
						| Dumling.Lemma<"he", "Lexeme", "CCONJ">
						| Dumling.Lemma<"he", "Lexeme", "DET">
						| Dumling.Lemma<"he", "Lexeme", "INTJ">
						| Dumling.Lemma<"he", "Lexeme", "NOUN">
						| Dumling.Lemma<"he", "Lexeme", "NUM">
						| Dumling.Lemma<"he", "Lexeme", "X">
						| Dumling.Lemma<"he", "Lexeme", "PART">
						| Dumling.Lemma<"he", "Lexeme", "PRON">
						| Dumling.Lemma<"he", "Lexeme", "PROPN">
						| Dumling.Lemma<"he", "Lexeme", "PUNCT">
						| Dumling.Lemma<"he", "Lexeme", "SCONJ">
						| Dumling.Lemma<"he", "Lexeme", "SYM">
						| Dumling.Lemma<"he", "Lexeme", "VERB">
						| Dumling.Lemma<"he", "Morpheme", "Circumfix">
						| Dumling.Lemma<"he", "Morpheme", "Clitic">
						| Dumling.Lemma<"he", "Morpheme", "Duplifix">
						| Dumling.Lemma<"he", "Morpheme", "Infix">
						| Dumling.Lemma<"he", "Morpheme", "Interfix">
						| Dumling.Lemma<"he", "Morpheme", "Prefix">
						| Dumling.Lemma<"he", "Morpheme", "Root">
						| Dumling.Lemma<"he", "Morpheme", "Suffix">
						| Dumling.Lemma<"he", "Morpheme", "Suffixoid">
						| Dumling.Lemma<"he", "Morpheme", "ToneMarking">
						| Dumling.Lemma<"he", "Morpheme", "Transfix">
						| Dumling.Lemma<"he", "Phraseme", "Aphorism">
						| Dumling.Lemma<"he", "Phraseme", "DiscourseFormula">
						| Dumling.Lemma<"he", "Phraseme", "Idiom">
						| Dumling.Lemma<"he", "Phraseme", "Proverb">
				  >
				| undefined;
			nearSynonym?:
				| Array<
						| Dumling.Lemma<"de", "Lexeme", "ADJ">
						| Dumling.Lemma<"de", "Lexeme", "ADP">
						| Dumling.Lemma<"de", "Lexeme", "ADV">
						| Dumling.Lemma<"de", "Lexeme", "AUX">
						| Dumling.Lemma<"de", "Lexeme", "CCONJ">
						| Dumling.Lemma<"de", "Lexeme", "DET">
						| Dumling.Lemma<"de", "Lexeme", "INTJ">
						| Dumling.Lemma<"de", "Lexeme", "NOUN">
						| Dumling.Lemma<"de", "Lexeme", "NUM">
						| Dumling.Lemma<"de", "Lexeme", "X">
						| Dumling.Lemma<"de", "Lexeme", "PART">
						| Dumling.Lemma<"de", "Lexeme", "PRON">
						| Dumling.Lemma<"de", "Lexeme", "PROPN">
						| Dumling.Lemma<"de", "Lexeme", "PUNCT">
						| Dumling.Lemma<"de", "Lexeme", "SCONJ">
						| Dumling.Lemma<"de", "Lexeme", "SYM">
						| Dumling.Lemma<"de", "Lexeme", "VERB">
						| Dumling.Lemma<"de", "Morpheme", "Circumfix">
						| Dumling.Lemma<"de", "Morpheme", "Clitic">
						| Dumling.Lemma<"de", "Morpheme", "Duplifix">
						| Dumling.Lemma<"de", "Morpheme", "Infix">
						| Dumling.Lemma<"de", "Morpheme", "Interfix">
						| Dumling.Lemma<"de", "Morpheme", "Prefix">
						| Dumling.Lemma<"de", "Morpheme", "Root">
						| Dumling.Lemma<"de", "Morpheme", "Suffix">
						| Dumling.Lemma<"de", "Morpheme", "Suffixoid">
						| Dumling.Lemma<"de", "Morpheme", "Transfix">
						| Dumling.Lemma<"de", "Phraseme", "Aphorism">
						| Dumling.Lemma<"de", "Phraseme", "Collocation">
						| Dumling.Lemma<"de", "Phraseme", "DiscourseFormula">
						| Dumling.Lemma<"de", "Phraseme", "Idiom">
						| Dumling.Lemma<"de", "Phraseme", "Proverb">
						| Dumling.Lemma<"en", "Lexeme", "ADJ">
						| Dumling.Lemma<"en", "Lexeme", "ADP">
						| Dumling.Lemma<"en", "Lexeme", "ADV">
						| Dumling.Lemma<"en", "Lexeme", "AUX">
						| Dumling.Lemma<"en", "Lexeme", "CCONJ">
						| Dumling.Lemma<"en", "Lexeme", "DET">
						| Dumling.Lemma<"en", "Lexeme", "INTJ">
						| Dumling.Lemma<"en", "Lexeme", "NOUN">
						| Dumling.Lemma<"en", "Lexeme", "NUM">
						| Dumling.Lemma<"en", "Lexeme", "X">
						| Dumling.Lemma<"en", "Lexeme", "PART">
						| Dumling.Lemma<"en", "Lexeme", "PRON">
						| Dumling.Lemma<"en", "Lexeme", "PROPN">
						| Dumling.Lemma<"en", "Lexeme", "PUNCT">
						| Dumling.Lemma<"en", "Lexeme", "SCONJ">
						| Dumling.Lemma<"en", "Lexeme", "SYM">
						| Dumling.Lemma<"en", "Lexeme", "VERB">
						| Dumling.Lemma<"en", "Morpheme", "Circumfix">
						| Dumling.Lemma<"en", "Morpheme", "Clitic">
						| Dumling.Lemma<"en", "Morpheme", "Duplifix">
						| Dumling.Lemma<"en", "Morpheme", "Infix">
						| Dumling.Lemma<"en", "Morpheme", "Interfix">
						| Dumling.Lemma<"en", "Morpheme", "Prefix">
						| Dumling.Lemma<"en", "Morpheme", "Root">
						| Dumling.Lemma<"en", "Morpheme", "Suffix">
						| Dumling.Lemma<"en", "Morpheme", "Suffixoid">
						| Dumling.Lemma<"en", "Morpheme", "ToneMarking">
						| Dumling.Lemma<"en", "Morpheme", "Transfix">
						| Dumling.Lemma<"en", "Phraseme", "Aphorism">
						| Dumling.Lemma<"en", "Phraseme", "DiscourseFormula">
						| Dumling.Lemma<"en", "Phraseme", "Idiom">
						| Dumling.Lemma<"en", "Phraseme", "Proverb">
						| Dumling.Lemma<"he", "Lexeme", "ADJ">
						| Dumling.Lemma<"he", "Lexeme", "ADP">
						| Dumling.Lemma<"he", "Lexeme", "ADV">
						| Dumling.Lemma<"he", "Lexeme", "AUX">
						| Dumling.Lemma<"he", "Lexeme", "CCONJ">
						| Dumling.Lemma<"he", "Lexeme", "DET">
						| Dumling.Lemma<"he", "Lexeme", "INTJ">
						| Dumling.Lemma<"he", "Lexeme", "NOUN">
						| Dumling.Lemma<"he", "Lexeme", "NUM">
						| Dumling.Lemma<"he", "Lexeme", "X">
						| Dumling.Lemma<"he", "Lexeme", "PART">
						| Dumling.Lemma<"he", "Lexeme", "PRON">
						| Dumling.Lemma<"he", "Lexeme", "PROPN">
						| Dumling.Lemma<"he", "Lexeme", "PUNCT">
						| Dumling.Lemma<"he", "Lexeme", "SCONJ">
						| Dumling.Lemma<"he", "Lexeme", "SYM">
						| Dumling.Lemma<"he", "Lexeme", "VERB">
						| Dumling.Lemma<"he", "Morpheme", "Circumfix">
						| Dumling.Lemma<"he", "Morpheme", "Clitic">
						| Dumling.Lemma<"he", "Morpheme", "Duplifix">
						| Dumling.Lemma<"he", "Morpheme", "Infix">
						| Dumling.Lemma<"he", "Morpheme", "Interfix">
						| Dumling.Lemma<"he", "Morpheme", "Prefix">
						| Dumling.Lemma<"he", "Morpheme", "Root">
						| Dumling.Lemma<"he", "Morpheme", "Suffix">
						| Dumling.Lemma<"he", "Morpheme", "Suffixoid">
						| Dumling.Lemma<"he", "Morpheme", "ToneMarking">
						| Dumling.Lemma<"he", "Morpheme", "Transfix">
						| Dumling.Lemma<"he", "Phraseme", "Aphorism">
						| Dumling.Lemma<"he", "Phraseme", "DiscourseFormula">
						| Dumling.Lemma<"he", "Phraseme", "Idiom">
						| Dumling.Lemma<"he", "Phraseme", "Proverb">
				  >
				| undefined;
			antonym?:
				| Array<
						| Dumling.Lemma<"de", "Lexeme", "ADJ">
						| Dumling.Lemma<"de", "Lexeme", "ADP">
						| Dumling.Lemma<"de", "Lexeme", "ADV">
						| Dumling.Lemma<"de", "Lexeme", "AUX">
						| Dumling.Lemma<"de", "Lexeme", "CCONJ">
						| Dumling.Lemma<"de", "Lexeme", "DET">
						| Dumling.Lemma<"de", "Lexeme", "INTJ">
						| Dumling.Lemma<"de", "Lexeme", "NOUN">
						| Dumling.Lemma<"de", "Lexeme", "NUM">
						| Dumling.Lemma<"de", "Lexeme", "X">
						| Dumling.Lemma<"de", "Lexeme", "PART">
						| Dumling.Lemma<"de", "Lexeme", "PRON">
						| Dumling.Lemma<"de", "Lexeme", "PROPN">
						| Dumling.Lemma<"de", "Lexeme", "PUNCT">
						| Dumling.Lemma<"de", "Lexeme", "SCONJ">
						| Dumling.Lemma<"de", "Lexeme", "SYM">
						| Dumling.Lemma<"de", "Lexeme", "VERB">
						| Dumling.Lemma<"de", "Morpheme", "Circumfix">
						| Dumling.Lemma<"de", "Morpheme", "Clitic">
						| Dumling.Lemma<"de", "Morpheme", "Duplifix">
						| Dumling.Lemma<"de", "Morpheme", "Infix">
						| Dumling.Lemma<"de", "Morpheme", "Interfix">
						| Dumling.Lemma<"de", "Morpheme", "Prefix">
						| Dumling.Lemma<"de", "Morpheme", "Root">
						| Dumling.Lemma<"de", "Morpheme", "Suffix">
						| Dumling.Lemma<"de", "Morpheme", "Suffixoid">
						| Dumling.Lemma<"de", "Morpheme", "Transfix">
						| Dumling.Lemma<"de", "Phraseme", "Aphorism">
						| Dumling.Lemma<"de", "Phraseme", "Collocation">
						| Dumling.Lemma<"de", "Phraseme", "DiscourseFormula">
						| Dumling.Lemma<"de", "Phraseme", "Idiom">
						| Dumling.Lemma<"de", "Phraseme", "Proverb">
						| Dumling.Lemma<"en", "Lexeme", "ADJ">
						| Dumling.Lemma<"en", "Lexeme", "ADP">
						| Dumling.Lemma<"en", "Lexeme", "ADV">
						| Dumling.Lemma<"en", "Lexeme", "AUX">
						| Dumling.Lemma<"en", "Lexeme", "CCONJ">
						| Dumling.Lemma<"en", "Lexeme", "DET">
						| Dumling.Lemma<"en", "Lexeme", "INTJ">
						| Dumling.Lemma<"en", "Lexeme", "NOUN">
						| Dumling.Lemma<"en", "Lexeme", "NUM">
						| Dumling.Lemma<"en", "Lexeme", "X">
						| Dumling.Lemma<"en", "Lexeme", "PART">
						| Dumling.Lemma<"en", "Lexeme", "PRON">
						| Dumling.Lemma<"en", "Lexeme", "PROPN">
						| Dumling.Lemma<"en", "Lexeme", "PUNCT">
						| Dumling.Lemma<"en", "Lexeme", "SCONJ">
						| Dumling.Lemma<"en", "Lexeme", "SYM">
						| Dumling.Lemma<"en", "Lexeme", "VERB">
						| Dumling.Lemma<"en", "Morpheme", "Circumfix">
						| Dumling.Lemma<"en", "Morpheme", "Clitic">
						| Dumling.Lemma<"en", "Morpheme", "Duplifix">
						| Dumling.Lemma<"en", "Morpheme", "Infix">
						| Dumling.Lemma<"en", "Morpheme", "Interfix">
						| Dumling.Lemma<"en", "Morpheme", "Prefix">
						| Dumling.Lemma<"en", "Morpheme", "Root">
						| Dumling.Lemma<"en", "Morpheme", "Suffix">
						| Dumling.Lemma<"en", "Morpheme", "Suffixoid">
						| Dumling.Lemma<"en", "Morpheme", "ToneMarking">
						| Dumling.Lemma<"en", "Morpheme", "Transfix">
						| Dumling.Lemma<"en", "Phraseme", "Aphorism">
						| Dumling.Lemma<"en", "Phraseme", "DiscourseFormula">
						| Dumling.Lemma<"en", "Phraseme", "Idiom">
						| Dumling.Lemma<"en", "Phraseme", "Proverb">
						| Dumling.Lemma<"he", "Lexeme", "ADJ">
						| Dumling.Lemma<"he", "Lexeme", "ADP">
						| Dumling.Lemma<"he", "Lexeme", "ADV">
						| Dumling.Lemma<"he", "Lexeme", "AUX">
						| Dumling.Lemma<"he", "Lexeme", "CCONJ">
						| Dumling.Lemma<"he", "Lexeme", "DET">
						| Dumling.Lemma<"he", "Lexeme", "INTJ">
						| Dumling.Lemma<"he", "Lexeme", "NOUN">
						| Dumling.Lemma<"he", "Lexeme", "NUM">
						| Dumling.Lemma<"he", "Lexeme", "X">
						| Dumling.Lemma<"he", "Lexeme", "PART">
						| Dumling.Lemma<"he", "Lexeme", "PRON">
						| Dumling.Lemma<"he", "Lexeme", "PROPN">
						| Dumling.Lemma<"he", "Lexeme", "PUNCT">
						| Dumling.Lemma<"he", "Lexeme", "SCONJ">
						| Dumling.Lemma<"he", "Lexeme", "SYM">
						| Dumling.Lemma<"he", "Lexeme", "VERB">
						| Dumling.Lemma<"he", "Morpheme", "Circumfix">
						| Dumling.Lemma<"he", "Morpheme", "Clitic">
						| Dumling.Lemma<"he", "Morpheme", "Duplifix">
						| Dumling.Lemma<"he", "Morpheme", "Infix">
						| Dumling.Lemma<"he", "Morpheme", "Interfix">
						| Dumling.Lemma<"he", "Morpheme", "Prefix">
						| Dumling.Lemma<"he", "Morpheme", "Root">
						| Dumling.Lemma<"he", "Morpheme", "Suffix">
						| Dumling.Lemma<"he", "Morpheme", "Suffixoid">
						| Dumling.Lemma<"he", "Morpheme", "ToneMarking">
						| Dumling.Lemma<"he", "Morpheme", "Transfix">
						| Dumling.Lemma<"he", "Phraseme", "Aphorism">
						| Dumling.Lemma<"he", "Phraseme", "DiscourseFormula">
						| Dumling.Lemma<"he", "Phraseme", "Idiom">
						| Dumling.Lemma<"he", "Phraseme", "Proverb">
				  >
				| undefined;
			nearAntonym?:
				| Array<
						| Dumling.Lemma<"de", "Lexeme", "ADJ">
						| Dumling.Lemma<"de", "Lexeme", "ADP">
						| Dumling.Lemma<"de", "Lexeme", "ADV">
						| Dumling.Lemma<"de", "Lexeme", "AUX">
						| Dumling.Lemma<"de", "Lexeme", "CCONJ">
						| Dumling.Lemma<"de", "Lexeme", "DET">
						| Dumling.Lemma<"de", "Lexeme", "INTJ">
						| Dumling.Lemma<"de", "Lexeme", "NOUN">
						| Dumling.Lemma<"de", "Lexeme", "NUM">
						| Dumling.Lemma<"de", "Lexeme", "X">
						| Dumling.Lemma<"de", "Lexeme", "PART">
						| Dumling.Lemma<"de", "Lexeme", "PRON">
						| Dumling.Lemma<"de", "Lexeme", "PROPN">
						| Dumling.Lemma<"de", "Lexeme", "PUNCT">
						| Dumling.Lemma<"de", "Lexeme", "SCONJ">
						| Dumling.Lemma<"de", "Lexeme", "SYM">
						| Dumling.Lemma<"de", "Lexeme", "VERB">
						| Dumling.Lemma<"de", "Morpheme", "Circumfix">
						| Dumling.Lemma<"de", "Morpheme", "Clitic">
						| Dumling.Lemma<"de", "Morpheme", "Duplifix">
						| Dumling.Lemma<"de", "Morpheme", "Infix">
						| Dumling.Lemma<"de", "Morpheme", "Interfix">
						| Dumling.Lemma<"de", "Morpheme", "Prefix">
						| Dumling.Lemma<"de", "Morpheme", "Root">
						| Dumling.Lemma<"de", "Morpheme", "Suffix">
						| Dumling.Lemma<"de", "Morpheme", "Suffixoid">
						| Dumling.Lemma<"de", "Morpheme", "Transfix">
						| Dumling.Lemma<"de", "Phraseme", "Aphorism">
						| Dumling.Lemma<"de", "Phraseme", "Collocation">
						| Dumling.Lemma<"de", "Phraseme", "DiscourseFormula">
						| Dumling.Lemma<"de", "Phraseme", "Idiom">
						| Dumling.Lemma<"de", "Phraseme", "Proverb">
						| Dumling.Lemma<"en", "Lexeme", "ADJ">
						| Dumling.Lemma<"en", "Lexeme", "ADP">
						| Dumling.Lemma<"en", "Lexeme", "ADV">
						| Dumling.Lemma<"en", "Lexeme", "AUX">
						| Dumling.Lemma<"en", "Lexeme", "CCONJ">
						| Dumling.Lemma<"en", "Lexeme", "DET">
						| Dumling.Lemma<"en", "Lexeme", "INTJ">
						| Dumling.Lemma<"en", "Lexeme", "NOUN">
						| Dumling.Lemma<"en", "Lexeme", "NUM">
						| Dumling.Lemma<"en", "Lexeme", "X">
						| Dumling.Lemma<"en", "Lexeme", "PART">
						| Dumling.Lemma<"en", "Lexeme", "PRON">
						| Dumling.Lemma<"en", "Lexeme", "PROPN">
						| Dumling.Lemma<"en", "Lexeme", "PUNCT">
						| Dumling.Lemma<"en", "Lexeme", "SCONJ">
						| Dumling.Lemma<"en", "Lexeme", "SYM">
						| Dumling.Lemma<"en", "Lexeme", "VERB">
						| Dumling.Lemma<"en", "Morpheme", "Circumfix">
						| Dumling.Lemma<"en", "Morpheme", "Clitic">
						| Dumling.Lemma<"en", "Morpheme", "Duplifix">
						| Dumling.Lemma<"en", "Morpheme", "Infix">
						| Dumling.Lemma<"en", "Morpheme", "Interfix">
						| Dumling.Lemma<"en", "Morpheme", "Prefix">
						| Dumling.Lemma<"en", "Morpheme", "Root">
						| Dumling.Lemma<"en", "Morpheme", "Suffix">
						| Dumling.Lemma<"en", "Morpheme", "Suffixoid">
						| Dumling.Lemma<"en", "Morpheme", "ToneMarking">
						| Dumling.Lemma<"en", "Morpheme", "Transfix">
						| Dumling.Lemma<"en", "Phraseme", "Aphorism">
						| Dumling.Lemma<"en", "Phraseme", "DiscourseFormula">
						| Dumling.Lemma<"en", "Phraseme", "Idiom">
						| Dumling.Lemma<"en", "Phraseme", "Proverb">
						| Dumling.Lemma<"he", "Lexeme", "ADJ">
						| Dumling.Lemma<"he", "Lexeme", "ADP">
						| Dumling.Lemma<"he", "Lexeme", "ADV">
						| Dumling.Lemma<"he", "Lexeme", "AUX">
						| Dumling.Lemma<"he", "Lexeme", "CCONJ">
						| Dumling.Lemma<"he", "Lexeme", "DET">
						| Dumling.Lemma<"he", "Lexeme", "INTJ">
						| Dumling.Lemma<"he", "Lexeme", "NOUN">
						| Dumling.Lemma<"he", "Lexeme", "NUM">
						| Dumling.Lemma<"he", "Lexeme", "X">
						| Dumling.Lemma<"he", "Lexeme", "PART">
						| Dumling.Lemma<"he", "Lexeme", "PRON">
						| Dumling.Lemma<"he", "Lexeme", "PROPN">
						| Dumling.Lemma<"he", "Lexeme", "PUNCT">
						| Dumling.Lemma<"he", "Lexeme", "SCONJ">
						| Dumling.Lemma<"he", "Lexeme", "SYM">
						| Dumling.Lemma<"he", "Lexeme", "VERB">
						| Dumling.Lemma<"he", "Morpheme", "Circumfix">
						| Dumling.Lemma<"he", "Morpheme", "Clitic">
						| Dumling.Lemma<"he", "Morpheme", "Duplifix">
						| Dumling.Lemma<"he", "Morpheme", "Infix">
						| Dumling.Lemma<"he", "Morpheme", "Interfix">
						| Dumling.Lemma<"he", "Morpheme", "Prefix">
						| Dumling.Lemma<"he", "Morpheme", "Root">
						| Dumling.Lemma<"he", "Morpheme", "Suffix">
						| Dumling.Lemma<"he", "Morpheme", "Suffixoid">
						| Dumling.Lemma<"he", "Morpheme", "ToneMarking">
						| Dumling.Lemma<"he", "Morpheme", "Transfix">
						| Dumling.Lemma<"he", "Phraseme", "Aphorism">
						| Dumling.Lemma<"he", "Phraseme", "DiscourseFormula">
						| Dumling.Lemma<"he", "Phraseme", "Idiom">
						| Dumling.Lemma<"he", "Phraseme", "Proverb">
				  >
				| undefined;
			hypernym?:
				| Array<
						| Dumling.Lemma<"de", "Lexeme", "ADJ">
						| Dumling.Lemma<"de", "Lexeme", "ADP">
						| Dumling.Lemma<"de", "Lexeme", "ADV">
						| Dumling.Lemma<"de", "Lexeme", "AUX">
						| Dumling.Lemma<"de", "Lexeme", "CCONJ">
						| Dumling.Lemma<"de", "Lexeme", "DET">
						| Dumling.Lemma<"de", "Lexeme", "INTJ">
						| Dumling.Lemma<"de", "Lexeme", "NOUN">
						| Dumling.Lemma<"de", "Lexeme", "NUM">
						| Dumling.Lemma<"de", "Lexeme", "X">
						| Dumling.Lemma<"de", "Lexeme", "PART">
						| Dumling.Lemma<"de", "Lexeme", "PRON">
						| Dumling.Lemma<"de", "Lexeme", "PROPN">
						| Dumling.Lemma<"de", "Lexeme", "PUNCT">
						| Dumling.Lemma<"de", "Lexeme", "SCONJ">
						| Dumling.Lemma<"de", "Lexeme", "SYM">
						| Dumling.Lemma<"de", "Lexeme", "VERB">
						| Dumling.Lemma<"de", "Morpheme", "Circumfix">
						| Dumling.Lemma<"de", "Morpheme", "Clitic">
						| Dumling.Lemma<"de", "Morpheme", "Duplifix">
						| Dumling.Lemma<"de", "Morpheme", "Infix">
						| Dumling.Lemma<"de", "Morpheme", "Interfix">
						| Dumling.Lemma<"de", "Morpheme", "Prefix">
						| Dumling.Lemma<"de", "Morpheme", "Root">
						| Dumling.Lemma<"de", "Morpheme", "Suffix">
						| Dumling.Lemma<"de", "Morpheme", "Suffixoid">
						| Dumling.Lemma<"de", "Morpheme", "Transfix">
						| Dumling.Lemma<"de", "Phraseme", "Aphorism">
						| Dumling.Lemma<"de", "Phraseme", "Collocation">
						| Dumling.Lemma<"de", "Phraseme", "DiscourseFormula">
						| Dumling.Lemma<"de", "Phraseme", "Idiom">
						| Dumling.Lemma<"de", "Phraseme", "Proverb">
						| Dumling.Lemma<"en", "Lexeme", "ADJ">
						| Dumling.Lemma<"en", "Lexeme", "ADP">
						| Dumling.Lemma<"en", "Lexeme", "ADV">
						| Dumling.Lemma<"en", "Lexeme", "AUX">
						| Dumling.Lemma<"en", "Lexeme", "CCONJ">
						| Dumling.Lemma<"en", "Lexeme", "DET">
						| Dumling.Lemma<"en", "Lexeme", "INTJ">
						| Dumling.Lemma<"en", "Lexeme", "NOUN">
						| Dumling.Lemma<"en", "Lexeme", "NUM">
						| Dumling.Lemma<"en", "Lexeme", "X">
						| Dumling.Lemma<"en", "Lexeme", "PART">
						| Dumling.Lemma<"en", "Lexeme", "PRON">
						| Dumling.Lemma<"en", "Lexeme", "PROPN">
						| Dumling.Lemma<"en", "Lexeme", "PUNCT">
						| Dumling.Lemma<"en", "Lexeme", "SCONJ">
						| Dumling.Lemma<"en", "Lexeme", "SYM">
						| Dumling.Lemma<"en", "Lexeme", "VERB">
						| Dumling.Lemma<"en", "Morpheme", "Circumfix">
						| Dumling.Lemma<"en", "Morpheme", "Clitic">
						| Dumling.Lemma<"en", "Morpheme", "Duplifix">
						| Dumling.Lemma<"en", "Morpheme", "Infix">
						| Dumling.Lemma<"en", "Morpheme", "Interfix">
						| Dumling.Lemma<"en", "Morpheme", "Prefix">
						| Dumling.Lemma<"en", "Morpheme", "Root">
						| Dumling.Lemma<"en", "Morpheme", "Suffix">
						| Dumling.Lemma<"en", "Morpheme", "Suffixoid">
						| Dumling.Lemma<"en", "Morpheme", "ToneMarking">
						| Dumling.Lemma<"en", "Morpheme", "Transfix">
						| Dumling.Lemma<"en", "Phraseme", "Aphorism">
						| Dumling.Lemma<"en", "Phraseme", "DiscourseFormula">
						| Dumling.Lemma<"en", "Phraseme", "Idiom">
						| Dumling.Lemma<"en", "Phraseme", "Proverb">
						| Dumling.Lemma<"he", "Lexeme", "ADJ">
						| Dumling.Lemma<"he", "Lexeme", "ADP">
						| Dumling.Lemma<"he", "Lexeme", "ADV">
						| Dumling.Lemma<"he", "Lexeme", "AUX">
						| Dumling.Lemma<"he", "Lexeme", "CCONJ">
						| Dumling.Lemma<"he", "Lexeme", "DET">
						| Dumling.Lemma<"he", "Lexeme", "INTJ">
						| Dumling.Lemma<"he", "Lexeme", "NOUN">
						| Dumling.Lemma<"he", "Lexeme", "NUM">
						| Dumling.Lemma<"he", "Lexeme", "X">
						| Dumling.Lemma<"he", "Lexeme", "PART">
						| Dumling.Lemma<"he", "Lexeme", "PRON">
						| Dumling.Lemma<"he", "Lexeme", "PROPN">
						| Dumling.Lemma<"he", "Lexeme", "PUNCT">
						| Dumling.Lemma<"he", "Lexeme", "SCONJ">
						| Dumling.Lemma<"he", "Lexeme", "SYM">
						| Dumling.Lemma<"he", "Lexeme", "VERB">
						| Dumling.Lemma<"he", "Morpheme", "Circumfix">
						| Dumling.Lemma<"he", "Morpheme", "Clitic">
						| Dumling.Lemma<"he", "Morpheme", "Duplifix">
						| Dumling.Lemma<"he", "Morpheme", "Infix">
						| Dumling.Lemma<"he", "Morpheme", "Interfix">
						| Dumling.Lemma<"he", "Morpheme", "Prefix">
						| Dumling.Lemma<"he", "Morpheme", "Root">
						| Dumling.Lemma<"he", "Morpheme", "Suffix">
						| Dumling.Lemma<"he", "Morpheme", "Suffixoid">
						| Dumling.Lemma<"he", "Morpheme", "ToneMarking">
						| Dumling.Lemma<"he", "Morpheme", "Transfix">
						| Dumling.Lemma<"he", "Phraseme", "Aphorism">
						| Dumling.Lemma<"he", "Phraseme", "DiscourseFormula">
						| Dumling.Lemma<"he", "Phraseme", "Idiom">
						| Dumling.Lemma<"he", "Phraseme", "Proverb">
				  >
				| undefined;
			holonym?:
				| Array<
						| Dumling.Lemma<"de", "Lexeme", "ADJ">
						| Dumling.Lemma<"de", "Lexeme", "ADP">
						| Dumling.Lemma<"de", "Lexeme", "ADV">
						| Dumling.Lemma<"de", "Lexeme", "AUX">
						| Dumling.Lemma<"de", "Lexeme", "CCONJ">
						| Dumling.Lemma<"de", "Lexeme", "DET">
						| Dumling.Lemma<"de", "Lexeme", "INTJ">
						| Dumling.Lemma<"de", "Lexeme", "NOUN">
						| Dumling.Lemma<"de", "Lexeme", "NUM">
						| Dumling.Lemma<"de", "Lexeme", "X">
						| Dumling.Lemma<"de", "Lexeme", "PART">
						| Dumling.Lemma<"de", "Lexeme", "PRON">
						| Dumling.Lemma<"de", "Lexeme", "PROPN">
						| Dumling.Lemma<"de", "Lexeme", "PUNCT">
						| Dumling.Lemma<"de", "Lexeme", "SCONJ">
						| Dumling.Lemma<"de", "Lexeme", "SYM">
						| Dumling.Lemma<"de", "Lexeme", "VERB">
						| Dumling.Lemma<"de", "Morpheme", "Circumfix">
						| Dumling.Lemma<"de", "Morpheme", "Clitic">
						| Dumling.Lemma<"de", "Morpheme", "Duplifix">
						| Dumling.Lemma<"de", "Morpheme", "Infix">
						| Dumling.Lemma<"de", "Morpheme", "Interfix">
						| Dumling.Lemma<"de", "Morpheme", "Prefix">
						| Dumling.Lemma<"de", "Morpheme", "Root">
						| Dumling.Lemma<"de", "Morpheme", "Suffix">
						| Dumling.Lemma<"de", "Morpheme", "Suffixoid">
						| Dumling.Lemma<"de", "Morpheme", "Transfix">
						| Dumling.Lemma<"de", "Phraseme", "Aphorism">
						| Dumling.Lemma<"de", "Phraseme", "Collocation">
						| Dumling.Lemma<"de", "Phraseme", "DiscourseFormula">
						| Dumling.Lemma<"de", "Phraseme", "Idiom">
						| Dumling.Lemma<"de", "Phraseme", "Proverb">
						| Dumling.Lemma<"en", "Lexeme", "ADJ">
						| Dumling.Lemma<"en", "Lexeme", "ADP">
						| Dumling.Lemma<"en", "Lexeme", "ADV">
						| Dumling.Lemma<"en", "Lexeme", "AUX">
						| Dumling.Lemma<"en", "Lexeme", "CCONJ">
						| Dumling.Lemma<"en", "Lexeme", "DET">
						| Dumling.Lemma<"en", "Lexeme", "INTJ">
						| Dumling.Lemma<"en", "Lexeme", "NOUN">
						| Dumling.Lemma<"en", "Lexeme", "NUM">
						| Dumling.Lemma<"en", "Lexeme", "X">
						| Dumling.Lemma<"en", "Lexeme", "PART">
						| Dumling.Lemma<"en", "Lexeme", "PRON">
						| Dumling.Lemma<"en", "Lexeme", "PROPN">
						| Dumling.Lemma<"en", "Lexeme", "PUNCT">
						| Dumling.Lemma<"en", "Lexeme", "SCONJ">
						| Dumling.Lemma<"en", "Lexeme", "SYM">
						| Dumling.Lemma<"en", "Lexeme", "VERB">
						| Dumling.Lemma<"en", "Morpheme", "Circumfix">
						| Dumling.Lemma<"en", "Morpheme", "Clitic">
						| Dumling.Lemma<"en", "Morpheme", "Duplifix">
						| Dumling.Lemma<"en", "Morpheme", "Infix">
						| Dumling.Lemma<"en", "Morpheme", "Interfix">
						| Dumling.Lemma<"en", "Morpheme", "Prefix">
						| Dumling.Lemma<"en", "Morpheme", "Root">
						| Dumling.Lemma<"en", "Morpheme", "Suffix">
						| Dumling.Lemma<"en", "Morpheme", "Suffixoid">
						| Dumling.Lemma<"en", "Morpheme", "ToneMarking">
						| Dumling.Lemma<"en", "Morpheme", "Transfix">
						| Dumling.Lemma<"en", "Phraseme", "Aphorism">
						| Dumling.Lemma<"en", "Phraseme", "DiscourseFormula">
						| Dumling.Lemma<"en", "Phraseme", "Idiom">
						| Dumling.Lemma<"en", "Phraseme", "Proverb">
						| Dumling.Lemma<"he", "Lexeme", "ADJ">
						| Dumling.Lemma<"he", "Lexeme", "ADP">
						| Dumling.Lemma<"he", "Lexeme", "ADV">
						| Dumling.Lemma<"he", "Lexeme", "AUX">
						| Dumling.Lemma<"he", "Lexeme", "CCONJ">
						| Dumling.Lemma<"he", "Lexeme", "DET">
						| Dumling.Lemma<"he", "Lexeme", "INTJ">
						| Dumling.Lemma<"he", "Lexeme", "NOUN">
						| Dumling.Lemma<"he", "Lexeme", "NUM">
						| Dumling.Lemma<"he", "Lexeme", "X">
						| Dumling.Lemma<"he", "Lexeme", "PART">
						| Dumling.Lemma<"he", "Lexeme", "PRON">
						| Dumling.Lemma<"he", "Lexeme", "PROPN">
						| Dumling.Lemma<"he", "Lexeme", "PUNCT">
						| Dumling.Lemma<"he", "Lexeme", "SCONJ">
						| Dumling.Lemma<"he", "Lexeme", "SYM">
						| Dumling.Lemma<"he", "Lexeme", "VERB">
						| Dumling.Lemma<"he", "Morpheme", "Circumfix">
						| Dumling.Lemma<"he", "Morpheme", "Clitic">
						| Dumling.Lemma<"he", "Morpheme", "Duplifix">
						| Dumling.Lemma<"he", "Morpheme", "Infix">
						| Dumling.Lemma<"he", "Morpheme", "Interfix">
						| Dumling.Lemma<"he", "Morpheme", "Prefix">
						| Dumling.Lemma<"he", "Morpheme", "Root">
						| Dumling.Lemma<"he", "Morpheme", "Suffix">
						| Dumling.Lemma<"he", "Morpheme", "Suffixoid">
						| Dumling.Lemma<"he", "Morpheme", "ToneMarking">
						| Dumling.Lemma<"he", "Morpheme", "Transfix">
						| Dumling.Lemma<"he", "Phraseme", "Aphorism">
						| Dumling.Lemma<"he", "Phraseme", "DiscourseFormula">
						| Dumling.Lemma<"he", "Phraseme", "Idiom">
						| Dumling.Lemma<"he", "Phraseme", "Proverb">
				  >
				| undefined;
	  };
export type ReadingKnowledge = {
	transcription?: string | undefined;
	definition?: string | undefined;
	translations?:
		| { en?: Array<string> | undefined; ru?: Array<string> | undefined }
		| undefined;
	morphologicalTree?: MorphologicalTree | undefined;
	lexicalBreakdown?: LexicalBreakdown | undefined;
	semanticRelations?: SemanticRelations | undefined;
	valency?: Array<ValencySlot> | undefined;
};
export type KnowledgeChange =
	| {
			kind: "Contribute" | "Correct";
			aspect: "transcription" | "definition";
			value: string;
	  }
	| { kind: "Retract"; aspect: "transcription" | "definition" }
	| {
			kind: "Contribute" | "Correct";
			aspect: "translations";
			language: TranslationLanguage;
			value: Array<string>;
	  }
	| { kind: "Retract"; aspect: "translations"; language: TranslationLanguage }
	| {
			kind: "Contribute" | "Correct";
			aspect: "semanticRelations";
			relation: "synonym";
			targetKind: "reading";
			value: Array<
				| Dumling.Reading<"de", "Lexeme", "ADJ">
				| Dumling.Reading<"de", "Lexeme", "ADP">
				| Dumling.Reading<"de", "Lexeme", "ADV">
				| Dumling.Reading<"de", "Lexeme", "AUX">
				| Dumling.Reading<"de", "Lexeme", "CCONJ">
				| Dumling.Reading<"de", "Lexeme", "DET">
				| Dumling.Reading<"de", "Lexeme", "INTJ">
				| Dumling.Reading<"de", "Lexeme", "NOUN">
				| Dumling.Reading<"de", "Lexeme", "NUM">
				| Dumling.Reading<"de", "Lexeme", "X">
				| Dumling.Reading<"de", "Lexeme", "PART">
				| Dumling.Reading<"de", "Lexeme", "PRON">
				| Dumling.Reading<"de", "Lexeme", "PROPN">
				| Dumling.Reading<"de", "Lexeme", "PUNCT">
				| Dumling.Reading<"de", "Lexeme", "SCONJ">
				| Dumling.Reading<"de", "Lexeme", "SYM">
				| Dumling.Reading<"de", "Lexeme", "VERB">
				| Dumling.Reading<"de", "Morpheme", "Circumfix">
				| Dumling.Reading<"de", "Morpheme", "Clitic">
				| Dumling.Reading<"de", "Morpheme", "Duplifix">
				| Dumling.Reading<"de", "Morpheme", "Infix">
				| Dumling.Reading<"de", "Morpheme", "Interfix">
				| Dumling.Reading<"de", "Morpheme", "Prefix">
				| Dumling.Reading<"de", "Morpheme", "Root">
				| Dumling.Reading<"de", "Morpheme", "Suffix">
				| Dumling.Reading<"de", "Morpheme", "Suffixoid">
				| Dumling.Reading<"de", "Morpheme", "Transfix">
				| Dumling.Reading<"de", "Phraseme", "Aphorism">
				| Dumling.Reading<"de", "Phraseme", "Collocation">
				| Dumling.Reading<"de", "Phraseme", "DiscourseFormula">
				| Dumling.Reading<"de", "Phraseme", "Idiom">
				| Dumling.Reading<"de", "Phraseme", "Proverb">
				| Dumling.Reading<"en", "Lexeme", "ADJ">
				| Dumling.Reading<"en", "Lexeme", "ADP">
				| Dumling.Reading<"en", "Lexeme", "ADV">
				| Dumling.Reading<"en", "Lexeme", "AUX">
				| Dumling.Reading<"en", "Lexeme", "CCONJ">
				| Dumling.Reading<"en", "Lexeme", "DET">
				| Dumling.Reading<"en", "Lexeme", "INTJ">
				| Dumling.Reading<"en", "Lexeme", "NOUN">
				| Dumling.Reading<"en", "Lexeme", "NUM">
				| Dumling.Reading<"en", "Lexeme", "X">
				| Dumling.Reading<"en", "Lexeme", "PART">
				| Dumling.Reading<"en", "Lexeme", "PRON">
				| Dumling.Reading<"en", "Lexeme", "PROPN">
				| Dumling.Reading<"en", "Lexeme", "PUNCT">
				| Dumling.Reading<"en", "Lexeme", "SCONJ">
				| Dumling.Reading<"en", "Lexeme", "SYM">
				| Dumling.Reading<"en", "Lexeme", "VERB">
				| Dumling.Reading<"en", "Morpheme", "Circumfix">
				| Dumling.Reading<"en", "Morpheme", "Clitic">
				| Dumling.Reading<"en", "Morpheme", "Duplifix">
				| Dumling.Reading<"en", "Morpheme", "Infix">
				| Dumling.Reading<"en", "Morpheme", "Interfix">
				| Dumling.Reading<"en", "Morpheme", "Prefix">
				| Dumling.Reading<"en", "Morpheme", "Root">
				| Dumling.Reading<"en", "Morpheme", "Suffix">
				| Dumling.Reading<"en", "Morpheme", "Suffixoid">
				| Dumling.Reading<"en", "Morpheme", "ToneMarking">
				| Dumling.Reading<"en", "Morpheme", "Transfix">
				| Dumling.Reading<"en", "Phraseme", "Aphorism">
				| Dumling.Reading<"en", "Phraseme", "DiscourseFormula">
				| Dumling.Reading<"en", "Phraseme", "Idiom">
				| Dumling.Reading<"en", "Phraseme", "Proverb">
				| Dumling.Reading<"he", "Lexeme", "ADJ">
				| Dumling.Reading<"he", "Lexeme", "ADP">
				| Dumling.Reading<"he", "Lexeme", "ADV">
				| Dumling.Reading<"he", "Lexeme", "AUX">
				| Dumling.Reading<"he", "Lexeme", "CCONJ">
				| Dumling.Reading<"he", "Lexeme", "DET">
				| Dumling.Reading<"he", "Lexeme", "INTJ">
				| Dumling.Reading<"he", "Lexeme", "NOUN">
				| Dumling.Reading<"he", "Lexeme", "NUM">
				| Dumling.Reading<"he", "Lexeme", "X">
				| Dumling.Reading<"he", "Lexeme", "PART">
				| Dumling.Reading<"he", "Lexeme", "PRON">
				| Dumling.Reading<"he", "Lexeme", "PROPN">
				| Dumling.Reading<"he", "Lexeme", "PUNCT">
				| Dumling.Reading<"he", "Lexeme", "SCONJ">
				| Dumling.Reading<"he", "Lexeme", "SYM">
				| Dumling.Reading<"he", "Lexeme", "VERB">
				| Dumling.Reading<"he", "Morpheme", "Circumfix">
				| Dumling.Reading<"he", "Morpheme", "Clitic">
				| Dumling.Reading<"he", "Morpheme", "Duplifix">
				| Dumling.Reading<"he", "Morpheme", "Infix">
				| Dumling.Reading<"he", "Morpheme", "Interfix">
				| Dumling.Reading<"he", "Morpheme", "Prefix">
				| Dumling.Reading<"he", "Morpheme", "Root">
				| Dumling.Reading<"he", "Morpheme", "Suffix">
				| Dumling.Reading<"he", "Morpheme", "Suffixoid">
				| Dumling.Reading<"he", "Morpheme", "ToneMarking">
				| Dumling.Reading<"he", "Morpheme", "Transfix">
				| Dumling.Reading<"he", "Phraseme", "Aphorism">
				| Dumling.Reading<"he", "Phraseme", "DiscourseFormula">
				| Dumling.Reading<"he", "Phraseme", "Idiom">
				| Dumling.Reading<"he", "Phraseme", "Proverb">
			>;
	  }
	| {
			kind: "Contribute" | "Correct";
			aspect: "semanticRelations";
			relation: DirectSemanticRelation;
			targetKind?: "lemma" | undefined;
			value: Array<
				| Dumling.Lemma<"de", "Lexeme", "ADJ">
				| Dumling.Lemma<"de", "Lexeme", "ADP">
				| Dumling.Lemma<"de", "Lexeme", "ADV">
				| Dumling.Lemma<"de", "Lexeme", "AUX">
				| Dumling.Lemma<"de", "Lexeme", "CCONJ">
				| Dumling.Lemma<"de", "Lexeme", "DET">
				| Dumling.Lemma<"de", "Lexeme", "INTJ">
				| Dumling.Lemma<"de", "Lexeme", "NOUN">
				| Dumling.Lemma<"de", "Lexeme", "NUM">
				| Dumling.Lemma<"de", "Lexeme", "X">
				| Dumling.Lemma<"de", "Lexeme", "PART">
				| Dumling.Lemma<"de", "Lexeme", "PRON">
				| Dumling.Lemma<"de", "Lexeme", "PROPN">
				| Dumling.Lemma<"de", "Lexeme", "PUNCT">
				| Dumling.Lemma<"de", "Lexeme", "SCONJ">
				| Dumling.Lemma<"de", "Lexeme", "SYM">
				| Dumling.Lemma<"de", "Lexeme", "VERB">
				| Dumling.Lemma<"de", "Morpheme", "Circumfix">
				| Dumling.Lemma<"de", "Morpheme", "Clitic">
				| Dumling.Lemma<"de", "Morpheme", "Duplifix">
				| Dumling.Lemma<"de", "Morpheme", "Infix">
				| Dumling.Lemma<"de", "Morpheme", "Interfix">
				| Dumling.Lemma<"de", "Morpheme", "Prefix">
				| Dumling.Lemma<"de", "Morpheme", "Root">
				| Dumling.Lemma<"de", "Morpheme", "Suffix">
				| Dumling.Lemma<"de", "Morpheme", "Suffixoid">
				| Dumling.Lemma<"de", "Morpheme", "Transfix">
				| Dumling.Lemma<"de", "Phraseme", "Aphorism">
				| Dumling.Lemma<"de", "Phraseme", "Collocation">
				| Dumling.Lemma<"de", "Phraseme", "DiscourseFormula">
				| Dumling.Lemma<"de", "Phraseme", "Idiom">
				| Dumling.Lemma<"de", "Phraseme", "Proverb">
				| Dumling.Lemma<"en", "Lexeme", "ADJ">
				| Dumling.Lemma<"en", "Lexeme", "ADP">
				| Dumling.Lemma<"en", "Lexeme", "ADV">
				| Dumling.Lemma<"en", "Lexeme", "AUX">
				| Dumling.Lemma<"en", "Lexeme", "CCONJ">
				| Dumling.Lemma<"en", "Lexeme", "DET">
				| Dumling.Lemma<"en", "Lexeme", "INTJ">
				| Dumling.Lemma<"en", "Lexeme", "NOUN">
				| Dumling.Lemma<"en", "Lexeme", "NUM">
				| Dumling.Lemma<"en", "Lexeme", "X">
				| Dumling.Lemma<"en", "Lexeme", "PART">
				| Dumling.Lemma<"en", "Lexeme", "PRON">
				| Dumling.Lemma<"en", "Lexeme", "PROPN">
				| Dumling.Lemma<"en", "Lexeme", "PUNCT">
				| Dumling.Lemma<"en", "Lexeme", "SCONJ">
				| Dumling.Lemma<"en", "Lexeme", "SYM">
				| Dumling.Lemma<"en", "Lexeme", "VERB">
				| Dumling.Lemma<"en", "Morpheme", "Circumfix">
				| Dumling.Lemma<"en", "Morpheme", "Clitic">
				| Dumling.Lemma<"en", "Morpheme", "Duplifix">
				| Dumling.Lemma<"en", "Morpheme", "Infix">
				| Dumling.Lemma<"en", "Morpheme", "Interfix">
				| Dumling.Lemma<"en", "Morpheme", "Prefix">
				| Dumling.Lemma<"en", "Morpheme", "Root">
				| Dumling.Lemma<"en", "Morpheme", "Suffix">
				| Dumling.Lemma<"en", "Morpheme", "Suffixoid">
				| Dumling.Lemma<"en", "Morpheme", "ToneMarking">
				| Dumling.Lemma<"en", "Morpheme", "Transfix">
				| Dumling.Lemma<"en", "Phraseme", "Aphorism">
				| Dumling.Lemma<"en", "Phraseme", "DiscourseFormula">
				| Dumling.Lemma<"en", "Phraseme", "Idiom">
				| Dumling.Lemma<"en", "Phraseme", "Proverb">
				| Dumling.Lemma<"he", "Lexeme", "ADJ">
				| Dumling.Lemma<"he", "Lexeme", "ADP">
				| Dumling.Lemma<"he", "Lexeme", "ADV">
				| Dumling.Lemma<"he", "Lexeme", "AUX">
				| Dumling.Lemma<"he", "Lexeme", "CCONJ">
				| Dumling.Lemma<"he", "Lexeme", "DET">
				| Dumling.Lemma<"he", "Lexeme", "INTJ">
				| Dumling.Lemma<"he", "Lexeme", "NOUN">
				| Dumling.Lemma<"he", "Lexeme", "NUM">
				| Dumling.Lemma<"he", "Lexeme", "X">
				| Dumling.Lemma<"he", "Lexeme", "PART">
				| Dumling.Lemma<"he", "Lexeme", "PRON">
				| Dumling.Lemma<"he", "Lexeme", "PROPN">
				| Dumling.Lemma<"he", "Lexeme", "PUNCT">
				| Dumling.Lemma<"he", "Lexeme", "SCONJ">
				| Dumling.Lemma<"he", "Lexeme", "SYM">
				| Dumling.Lemma<"he", "Lexeme", "VERB">
				| Dumling.Lemma<"he", "Morpheme", "Circumfix">
				| Dumling.Lemma<"he", "Morpheme", "Clitic">
				| Dumling.Lemma<"he", "Morpheme", "Duplifix">
				| Dumling.Lemma<"he", "Morpheme", "Infix">
				| Dumling.Lemma<"he", "Morpheme", "Interfix">
				| Dumling.Lemma<"he", "Morpheme", "Prefix">
				| Dumling.Lemma<"he", "Morpheme", "Root">
				| Dumling.Lemma<"he", "Morpheme", "Suffix">
				| Dumling.Lemma<"he", "Morpheme", "Suffixoid">
				| Dumling.Lemma<"he", "Morpheme", "ToneMarking">
				| Dumling.Lemma<"he", "Morpheme", "Transfix">
				| Dumling.Lemma<"he", "Phraseme", "Aphorism">
				| Dumling.Lemma<"he", "Phraseme", "DiscourseFormula">
				| Dumling.Lemma<"he", "Phraseme", "Idiom">
				| Dumling.Lemma<"he", "Phraseme", "Proverb">
			>;
	  }
	| {
			kind: "Retract";
			aspect: "semanticRelations";
			relation: "synonym";
			targetKind: "reading";
	  }
	| {
			kind: "Retract";
			aspect: "semanticRelations";
			relation: DirectSemanticRelation;
			targetKind?: "lemma" | undefined;
	  }
	| {
			kind: "Contribute" | "Correct";
			aspect: "valency";
			value: Array<ValencySlot>;
	  }
	| {
			kind: "Retract";
			aspect: "valency";
			complement?: ValencyComplement | undefined;
	  }
	| {
			kind: "Contribute" | "Correct";
			aspect: "morphologicalTree";
			value: MorphologicalTree;
	  }
	| {
			kind: "Contribute" | "Correct";
			aspect: "lexicalBreakdown";
			value: LexicalBreakdown;
	  }
	| { kind: "Retract"; aspect: "morphologicalTree" | "lexicalBreakdown" };
export type SemanticRelation =
	| "synonym"
	| "nearSynonym"
	| "antonym"
	| "nearAntonym"
	| "hypernym"
	| "hyponym"
	| "meronym"
	| "holonym";
export type SemanticRelationProjection = {
	source:
		| Dumling.Reading<"de", "Lexeme", "ADJ">
		| Dumling.Reading<"de", "Lexeme", "ADP">
		| Dumling.Reading<"de", "Lexeme", "ADV">
		| Dumling.Reading<"de", "Lexeme", "AUX">
		| Dumling.Reading<"de", "Lexeme", "CCONJ">
		| Dumling.Reading<"de", "Lexeme", "DET">
		| Dumling.Reading<"de", "Lexeme", "INTJ">
		| Dumling.Reading<"de", "Lexeme", "NOUN">
		| Dumling.Reading<"de", "Lexeme", "NUM">
		| Dumling.Reading<"de", "Lexeme", "X">
		| Dumling.Reading<"de", "Lexeme", "PART">
		| Dumling.Reading<"de", "Lexeme", "PRON">
		| Dumling.Reading<"de", "Lexeme", "PROPN">
		| Dumling.Reading<"de", "Lexeme", "PUNCT">
		| Dumling.Reading<"de", "Lexeme", "SCONJ">
		| Dumling.Reading<"de", "Lexeme", "SYM">
		| Dumling.Reading<"de", "Lexeme", "VERB">
		| Dumling.Reading<"de", "Morpheme", "Circumfix">
		| Dumling.Reading<"de", "Morpheme", "Clitic">
		| Dumling.Reading<"de", "Morpheme", "Duplifix">
		| Dumling.Reading<"de", "Morpheme", "Infix">
		| Dumling.Reading<"de", "Morpheme", "Interfix">
		| Dumling.Reading<"de", "Morpheme", "Prefix">
		| Dumling.Reading<"de", "Morpheme", "Root">
		| Dumling.Reading<"de", "Morpheme", "Suffix">
		| Dumling.Reading<"de", "Morpheme", "Suffixoid">
		| Dumling.Reading<"de", "Morpheme", "Transfix">
		| Dumling.Reading<"de", "Phraseme", "Aphorism">
		| Dumling.Reading<"de", "Phraseme", "Collocation">
		| Dumling.Reading<"de", "Phraseme", "DiscourseFormula">
		| Dumling.Reading<"de", "Phraseme", "Idiom">
		| Dumling.Reading<"de", "Phraseme", "Proverb">
		| Dumling.Reading<"en", "Lexeme", "ADJ">
		| Dumling.Reading<"en", "Lexeme", "ADP">
		| Dumling.Reading<"en", "Lexeme", "ADV">
		| Dumling.Reading<"en", "Lexeme", "AUX">
		| Dumling.Reading<"en", "Lexeme", "CCONJ">
		| Dumling.Reading<"en", "Lexeme", "DET">
		| Dumling.Reading<"en", "Lexeme", "INTJ">
		| Dumling.Reading<"en", "Lexeme", "NOUN">
		| Dumling.Reading<"en", "Lexeme", "NUM">
		| Dumling.Reading<"en", "Lexeme", "X">
		| Dumling.Reading<"en", "Lexeme", "PART">
		| Dumling.Reading<"en", "Lexeme", "PRON">
		| Dumling.Reading<"en", "Lexeme", "PROPN">
		| Dumling.Reading<"en", "Lexeme", "PUNCT">
		| Dumling.Reading<"en", "Lexeme", "SCONJ">
		| Dumling.Reading<"en", "Lexeme", "SYM">
		| Dumling.Reading<"en", "Lexeme", "VERB">
		| Dumling.Reading<"en", "Morpheme", "Circumfix">
		| Dumling.Reading<"en", "Morpheme", "Clitic">
		| Dumling.Reading<"en", "Morpheme", "Duplifix">
		| Dumling.Reading<"en", "Morpheme", "Infix">
		| Dumling.Reading<"en", "Morpheme", "Interfix">
		| Dumling.Reading<"en", "Morpheme", "Prefix">
		| Dumling.Reading<"en", "Morpheme", "Root">
		| Dumling.Reading<"en", "Morpheme", "Suffix">
		| Dumling.Reading<"en", "Morpheme", "Suffixoid">
		| Dumling.Reading<"en", "Morpheme", "ToneMarking">
		| Dumling.Reading<"en", "Morpheme", "Transfix">
		| Dumling.Reading<"en", "Phraseme", "Aphorism">
		| Dumling.Reading<"en", "Phraseme", "DiscourseFormula">
		| Dumling.Reading<"en", "Phraseme", "Idiom">
		| Dumling.Reading<"en", "Phraseme", "Proverb">
		| Dumling.Reading<"he", "Lexeme", "ADJ">
		| Dumling.Reading<"he", "Lexeme", "ADP">
		| Dumling.Reading<"he", "Lexeme", "ADV">
		| Dumling.Reading<"he", "Lexeme", "AUX">
		| Dumling.Reading<"he", "Lexeme", "CCONJ">
		| Dumling.Reading<"he", "Lexeme", "DET">
		| Dumling.Reading<"he", "Lexeme", "INTJ">
		| Dumling.Reading<"he", "Lexeme", "NOUN">
		| Dumling.Reading<"he", "Lexeme", "NUM">
		| Dumling.Reading<"he", "Lexeme", "X">
		| Dumling.Reading<"he", "Lexeme", "PART">
		| Dumling.Reading<"he", "Lexeme", "PRON">
		| Dumling.Reading<"he", "Lexeme", "PROPN">
		| Dumling.Reading<"he", "Lexeme", "PUNCT">
		| Dumling.Reading<"he", "Lexeme", "SCONJ">
		| Dumling.Reading<"he", "Lexeme", "SYM">
		| Dumling.Reading<"he", "Lexeme", "VERB">
		| Dumling.Reading<"he", "Morpheme", "Circumfix">
		| Dumling.Reading<"he", "Morpheme", "Clitic">
		| Dumling.Reading<"he", "Morpheme", "Duplifix">
		| Dumling.Reading<"he", "Morpheme", "Infix">
		| Dumling.Reading<"he", "Morpheme", "Interfix">
		| Dumling.Reading<"he", "Morpheme", "Prefix">
		| Dumling.Reading<"he", "Morpheme", "Root">
		| Dumling.Reading<"he", "Morpheme", "Suffix">
		| Dumling.Reading<"he", "Morpheme", "Suffixoid">
		| Dumling.Reading<"he", "Morpheme", "ToneMarking">
		| Dumling.Reading<"he", "Morpheme", "Transfix">
		| Dumling.Reading<"he", "Phraseme", "Aphorism">
		| Dumling.Reading<"he", "Phraseme", "DiscourseFormula">
		| Dumling.Reading<"he", "Phraseme", "Idiom">
		| Dumling.Reading<"he", "Phraseme", "Proverb">;
	relation: SemanticRelation;
	target:
		| (
				| Dumling.Lemma<"de", "Lexeme", "ADJ">
				| Dumling.Lemma<"de", "Lexeme", "ADP">
				| Dumling.Lemma<"de", "Lexeme", "ADV">
				| Dumling.Lemma<"de", "Lexeme", "AUX">
				| Dumling.Lemma<"de", "Lexeme", "CCONJ">
				| Dumling.Lemma<"de", "Lexeme", "DET">
				| Dumling.Lemma<"de", "Lexeme", "INTJ">
				| Dumling.Lemma<"de", "Lexeme", "NOUN">
				| Dumling.Lemma<"de", "Lexeme", "NUM">
				| Dumling.Lemma<"de", "Lexeme", "X">
				| Dumling.Lemma<"de", "Lexeme", "PART">
				| Dumling.Lemma<"de", "Lexeme", "PRON">
				| Dumling.Lemma<"de", "Lexeme", "PROPN">
				| Dumling.Lemma<"de", "Lexeme", "PUNCT">
				| Dumling.Lemma<"de", "Lexeme", "SCONJ">
				| Dumling.Lemma<"de", "Lexeme", "SYM">
				| Dumling.Lemma<"de", "Lexeme", "VERB">
				| Dumling.Lemma<"de", "Morpheme", "Circumfix">
				| Dumling.Lemma<"de", "Morpheme", "Clitic">
				| Dumling.Lemma<"de", "Morpheme", "Duplifix">
				| Dumling.Lemma<"de", "Morpheme", "Infix">
				| Dumling.Lemma<"de", "Morpheme", "Interfix">
				| Dumling.Lemma<"de", "Morpheme", "Prefix">
				| Dumling.Lemma<"de", "Morpheme", "Root">
				| Dumling.Lemma<"de", "Morpheme", "Suffix">
				| Dumling.Lemma<"de", "Morpheme", "Suffixoid">
				| Dumling.Lemma<"de", "Morpheme", "Transfix">
				| Dumling.Lemma<"de", "Phraseme", "Aphorism">
				| Dumling.Lemma<"de", "Phraseme", "Collocation">
				| Dumling.Lemma<"de", "Phraseme", "DiscourseFormula">
				| Dumling.Lemma<"de", "Phraseme", "Idiom">
				| Dumling.Lemma<"de", "Phraseme", "Proverb">
				| Dumling.Lemma<"en", "Lexeme", "ADJ">
				| Dumling.Lemma<"en", "Lexeme", "ADP">
				| Dumling.Lemma<"en", "Lexeme", "ADV">
				| Dumling.Lemma<"en", "Lexeme", "AUX">
				| Dumling.Lemma<"en", "Lexeme", "CCONJ">
				| Dumling.Lemma<"en", "Lexeme", "DET">
				| Dumling.Lemma<"en", "Lexeme", "INTJ">
				| Dumling.Lemma<"en", "Lexeme", "NOUN">
				| Dumling.Lemma<"en", "Lexeme", "NUM">
				| Dumling.Lemma<"en", "Lexeme", "X">
				| Dumling.Lemma<"en", "Lexeme", "PART">
				| Dumling.Lemma<"en", "Lexeme", "PRON">
				| Dumling.Lemma<"en", "Lexeme", "PROPN">
				| Dumling.Lemma<"en", "Lexeme", "PUNCT">
				| Dumling.Lemma<"en", "Lexeme", "SCONJ">
				| Dumling.Lemma<"en", "Lexeme", "SYM">
				| Dumling.Lemma<"en", "Lexeme", "VERB">
				| Dumling.Lemma<"en", "Morpheme", "Circumfix">
				| Dumling.Lemma<"en", "Morpheme", "Clitic">
				| Dumling.Lemma<"en", "Morpheme", "Duplifix">
				| Dumling.Lemma<"en", "Morpheme", "Infix">
				| Dumling.Lemma<"en", "Morpheme", "Interfix">
				| Dumling.Lemma<"en", "Morpheme", "Prefix">
				| Dumling.Lemma<"en", "Morpheme", "Root">
				| Dumling.Lemma<"en", "Morpheme", "Suffix">
				| Dumling.Lemma<"en", "Morpheme", "Suffixoid">
				| Dumling.Lemma<"en", "Morpheme", "ToneMarking">
				| Dumling.Lemma<"en", "Morpheme", "Transfix">
				| Dumling.Lemma<"en", "Phraseme", "Aphorism">
				| Dumling.Lemma<"en", "Phraseme", "DiscourseFormula">
				| Dumling.Lemma<"en", "Phraseme", "Idiom">
				| Dumling.Lemma<"en", "Phraseme", "Proverb">
				| Dumling.Lemma<"he", "Lexeme", "ADJ">
				| Dumling.Lemma<"he", "Lexeme", "ADP">
				| Dumling.Lemma<"he", "Lexeme", "ADV">
				| Dumling.Lemma<"he", "Lexeme", "AUX">
				| Dumling.Lemma<"he", "Lexeme", "CCONJ">
				| Dumling.Lemma<"he", "Lexeme", "DET">
				| Dumling.Lemma<"he", "Lexeme", "INTJ">
				| Dumling.Lemma<"he", "Lexeme", "NOUN">
				| Dumling.Lemma<"he", "Lexeme", "NUM">
				| Dumling.Lemma<"he", "Lexeme", "X">
				| Dumling.Lemma<"he", "Lexeme", "PART">
				| Dumling.Lemma<"he", "Lexeme", "PRON">
				| Dumling.Lemma<"he", "Lexeme", "PROPN">
				| Dumling.Lemma<"he", "Lexeme", "PUNCT">
				| Dumling.Lemma<"he", "Lexeme", "SCONJ">
				| Dumling.Lemma<"he", "Lexeme", "SYM">
				| Dumling.Lemma<"he", "Lexeme", "VERB">
				| Dumling.Lemma<"he", "Morpheme", "Circumfix">
				| Dumling.Lemma<"he", "Morpheme", "Clitic">
				| Dumling.Lemma<"he", "Morpheme", "Duplifix">
				| Dumling.Lemma<"he", "Morpheme", "Infix">
				| Dumling.Lemma<"he", "Morpheme", "Interfix">
				| Dumling.Lemma<"he", "Morpheme", "Prefix">
				| Dumling.Lemma<"he", "Morpheme", "Root">
				| Dumling.Lemma<"he", "Morpheme", "Suffix">
				| Dumling.Lemma<"he", "Morpheme", "Suffixoid">
				| Dumling.Lemma<"he", "Morpheme", "ToneMarking">
				| Dumling.Lemma<"he", "Morpheme", "Transfix">
				| Dumling.Lemma<"he", "Phraseme", "Aphorism">
				| Dumling.Lemma<"he", "Phraseme", "DiscourseFormula">
				| Dumling.Lemma<"he", "Phraseme", "Idiom">
				| Dumling.Lemma<"he", "Phraseme", "Proverb">
		  )
		| (
				| Dumling.Reading<"de", "Lexeme", "ADJ">
				| Dumling.Reading<"de", "Lexeme", "ADP">
				| Dumling.Reading<"de", "Lexeme", "ADV">
				| Dumling.Reading<"de", "Lexeme", "AUX">
				| Dumling.Reading<"de", "Lexeme", "CCONJ">
				| Dumling.Reading<"de", "Lexeme", "DET">
				| Dumling.Reading<"de", "Lexeme", "INTJ">
				| Dumling.Reading<"de", "Lexeme", "NOUN">
				| Dumling.Reading<"de", "Lexeme", "NUM">
				| Dumling.Reading<"de", "Lexeme", "X">
				| Dumling.Reading<"de", "Lexeme", "PART">
				| Dumling.Reading<"de", "Lexeme", "PRON">
				| Dumling.Reading<"de", "Lexeme", "PROPN">
				| Dumling.Reading<"de", "Lexeme", "PUNCT">
				| Dumling.Reading<"de", "Lexeme", "SCONJ">
				| Dumling.Reading<"de", "Lexeme", "SYM">
				| Dumling.Reading<"de", "Lexeme", "VERB">
				| Dumling.Reading<"de", "Morpheme", "Circumfix">
				| Dumling.Reading<"de", "Morpheme", "Clitic">
				| Dumling.Reading<"de", "Morpheme", "Duplifix">
				| Dumling.Reading<"de", "Morpheme", "Infix">
				| Dumling.Reading<"de", "Morpheme", "Interfix">
				| Dumling.Reading<"de", "Morpheme", "Prefix">
				| Dumling.Reading<"de", "Morpheme", "Root">
				| Dumling.Reading<"de", "Morpheme", "Suffix">
				| Dumling.Reading<"de", "Morpheme", "Suffixoid">
				| Dumling.Reading<"de", "Morpheme", "Transfix">
				| Dumling.Reading<"de", "Phraseme", "Aphorism">
				| Dumling.Reading<"de", "Phraseme", "Collocation">
				| Dumling.Reading<"de", "Phraseme", "DiscourseFormula">
				| Dumling.Reading<"de", "Phraseme", "Idiom">
				| Dumling.Reading<"de", "Phraseme", "Proverb">
				| Dumling.Reading<"en", "Lexeme", "ADJ">
				| Dumling.Reading<"en", "Lexeme", "ADP">
				| Dumling.Reading<"en", "Lexeme", "ADV">
				| Dumling.Reading<"en", "Lexeme", "AUX">
				| Dumling.Reading<"en", "Lexeme", "CCONJ">
				| Dumling.Reading<"en", "Lexeme", "DET">
				| Dumling.Reading<"en", "Lexeme", "INTJ">
				| Dumling.Reading<"en", "Lexeme", "NOUN">
				| Dumling.Reading<"en", "Lexeme", "NUM">
				| Dumling.Reading<"en", "Lexeme", "X">
				| Dumling.Reading<"en", "Lexeme", "PART">
				| Dumling.Reading<"en", "Lexeme", "PRON">
				| Dumling.Reading<"en", "Lexeme", "PROPN">
				| Dumling.Reading<"en", "Lexeme", "PUNCT">
				| Dumling.Reading<"en", "Lexeme", "SCONJ">
				| Dumling.Reading<"en", "Lexeme", "SYM">
				| Dumling.Reading<"en", "Lexeme", "VERB">
				| Dumling.Reading<"en", "Morpheme", "Circumfix">
				| Dumling.Reading<"en", "Morpheme", "Clitic">
				| Dumling.Reading<"en", "Morpheme", "Duplifix">
				| Dumling.Reading<"en", "Morpheme", "Infix">
				| Dumling.Reading<"en", "Morpheme", "Interfix">
				| Dumling.Reading<"en", "Morpheme", "Prefix">
				| Dumling.Reading<"en", "Morpheme", "Root">
				| Dumling.Reading<"en", "Morpheme", "Suffix">
				| Dumling.Reading<"en", "Morpheme", "Suffixoid">
				| Dumling.Reading<"en", "Morpheme", "ToneMarking">
				| Dumling.Reading<"en", "Morpheme", "Transfix">
				| Dumling.Reading<"en", "Phraseme", "Aphorism">
				| Dumling.Reading<"en", "Phraseme", "DiscourseFormula">
				| Dumling.Reading<"en", "Phraseme", "Idiom">
				| Dumling.Reading<"en", "Phraseme", "Proverb">
				| Dumling.Reading<"he", "Lexeme", "ADJ">
				| Dumling.Reading<"he", "Lexeme", "ADP">
				| Dumling.Reading<"he", "Lexeme", "ADV">
				| Dumling.Reading<"he", "Lexeme", "AUX">
				| Dumling.Reading<"he", "Lexeme", "CCONJ">
				| Dumling.Reading<"he", "Lexeme", "DET">
				| Dumling.Reading<"he", "Lexeme", "INTJ">
				| Dumling.Reading<"he", "Lexeme", "NOUN">
				| Dumling.Reading<"he", "Lexeme", "NUM">
				| Dumling.Reading<"he", "Lexeme", "X">
				| Dumling.Reading<"he", "Lexeme", "PART">
				| Dumling.Reading<"he", "Lexeme", "PRON">
				| Dumling.Reading<"he", "Lexeme", "PROPN">
				| Dumling.Reading<"he", "Lexeme", "PUNCT">
				| Dumling.Reading<"he", "Lexeme", "SCONJ">
				| Dumling.Reading<"he", "Lexeme", "SYM">
				| Dumling.Reading<"he", "Lexeme", "VERB">
				| Dumling.Reading<"he", "Morpheme", "Circumfix">
				| Dumling.Reading<"he", "Morpheme", "Clitic">
				| Dumling.Reading<"he", "Morpheme", "Duplifix">
				| Dumling.Reading<"he", "Morpheme", "Infix">
				| Dumling.Reading<"he", "Morpheme", "Interfix">
				| Dumling.Reading<"he", "Morpheme", "Prefix">
				| Dumling.Reading<"he", "Morpheme", "Root">
				| Dumling.Reading<"he", "Morpheme", "Suffix">
				| Dumling.Reading<"he", "Morpheme", "Suffixoid">
				| Dumling.Reading<"he", "Morpheme", "ToneMarking">
				| Dumling.Reading<"he", "Morpheme", "Transfix">
				| Dumling.Reading<"he", "Phraseme", "Aphorism">
				| Dumling.Reading<"he", "Phraseme", "DiscourseFormula">
				| Dumling.Reading<"he", "Phraseme", "Idiom">
				| Dumling.Reading<"he", "Phraseme", "Proverb">
		  );
	provenance: "direct" | "inferred";
};
export type GovernedCase = "Acc" | "Dat" | "Gen";
export type ValencySlotStatus = "Required" | "Optional";
export type ValencyReferent = "Someone" | "Something" | "Either";
export type ValencyComplement =
	| {
			kind: "Case";
			case: "Nom" | "Acc" | "Dat" | "Gen";
			referent: ValencyReferent;
	  }
	| {
			kind: "Preposition";
			preposition:
				| Dumling.Lemma<"de", "Lexeme", "ADP">
				| Dumling.Lemma<"en", "Lexeme", "ADP">
				| Dumling.Lemma<"he", "Lexeme", "ADP">;
			case: GovernedCase;
			referent: ValencyReferent;
	  };
export type ValencySlot = {
	status: ValencySlotStatus;
	complement: ValencyComplement;
};
export type GovernmentRelation = "governs" | "governedBy";
export type GovernmentProjection = {
	source:
		| Dumling.Reading<"de", "Lexeme", "ADJ">
		| Dumling.Reading<"de", "Lexeme", "ADP">
		| Dumling.Reading<"de", "Lexeme", "ADV">
		| Dumling.Reading<"de", "Lexeme", "AUX">
		| Dumling.Reading<"de", "Lexeme", "CCONJ">
		| Dumling.Reading<"de", "Lexeme", "DET">
		| Dumling.Reading<"de", "Lexeme", "INTJ">
		| Dumling.Reading<"de", "Lexeme", "NOUN">
		| Dumling.Reading<"de", "Lexeme", "NUM">
		| Dumling.Reading<"de", "Lexeme", "X">
		| Dumling.Reading<"de", "Lexeme", "PART">
		| Dumling.Reading<"de", "Lexeme", "PRON">
		| Dumling.Reading<"de", "Lexeme", "PROPN">
		| Dumling.Reading<"de", "Lexeme", "PUNCT">
		| Dumling.Reading<"de", "Lexeme", "SCONJ">
		| Dumling.Reading<"de", "Lexeme", "SYM">
		| Dumling.Reading<"de", "Lexeme", "VERB">
		| Dumling.Reading<"de", "Morpheme", "Circumfix">
		| Dumling.Reading<"de", "Morpheme", "Clitic">
		| Dumling.Reading<"de", "Morpheme", "Duplifix">
		| Dumling.Reading<"de", "Morpheme", "Infix">
		| Dumling.Reading<"de", "Morpheme", "Interfix">
		| Dumling.Reading<"de", "Morpheme", "Prefix">
		| Dumling.Reading<"de", "Morpheme", "Root">
		| Dumling.Reading<"de", "Morpheme", "Suffix">
		| Dumling.Reading<"de", "Morpheme", "Suffixoid">
		| Dumling.Reading<"de", "Morpheme", "Transfix">
		| Dumling.Reading<"de", "Phraseme", "Aphorism">
		| Dumling.Reading<"de", "Phraseme", "Collocation">
		| Dumling.Reading<"de", "Phraseme", "DiscourseFormula">
		| Dumling.Reading<"de", "Phraseme", "Idiom">
		| Dumling.Reading<"de", "Phraseme", "Proverb">
		| Dumling.Reading<"en", "Lexeme", "ADJ">
		| Dumling.Reading<"en", "Lexeme", "ADP">
		| Dumling.Reading<"en", "Lexeme", "ADV">
		| Dumling.Reading<"en", "Lexeme", "AUX">
		| Dumling.Reading<"en", "Lexeme", "CCONJ">
		| Dumling.Reading<"en", "Lexeme", "DET">
		| Dumling.Reading<"en", "Lexeme", "INTJ">
		| Dumling.Reading<"en", "Lexeme", "NOUN">
		| Dumling.Reading<"en", "Lexeme", "NUM">
		| Dumling.Reading<"en", "Lexeme", "X">
		| Dumling.Reading<"en", "Lexeme", "PART">
		| Dumling.Reading<"en", "Lexeme", "PRON">
		| Dumling.Reading<"en", "Lexeme", "PROPN">
		| Dumling.Reading<"en", "Lexeme", "PUNCT">
		| Dumling.Reading<"en", "Lexeme", "SCONJ">
		| Dumling.Reading<"en", "Lexeme", "SYM">
		| Dumling.Reading<"en", "Lexeme", "VERB">
		| Dumling.Reading<"en", "Morpheme", "Circumfix">
		| Dumling.Reading<"en", "Morpheme", "Clitic">
		| Dumling.Reading<"en", "Morpheme", "Duplifix">
		| Dumling.Reading<"en", "Morpheme", "Infix">
		| Dumling.Reading<"en", "Morpheme", "Interfix">
		| Dumling.Reading<"en", "Morpheme", "Prefix">
		| Dumling.Reading<"en", "Morpheme", "Root">
		| Dumling.Reading<"en", "Morpheme", "Suffix">
		| Dumling.Reading<"en", "Morpheme", "Suffixoid">
		| Dumling.Reading<"en", "Morpheme", "ToneMarking">
		| Dumling.Reading<"en", "Morpheme", "Transfix">
		| Dumling.Reading<"en", "Phraseme", "Aphorism">
		| Dumling.Reading<"en", "Phraseme", "DiscourseFormula">
		| Dumling.Reading<"en", "Phraseme", "Idiom">
		| Dumling.Reading<"en", "Phraseme", "Proverb">
		| Dumling.Reading<"he", "Lexeme", "ADJ">
		| Dumling.Reading<"he", "Lexeme", "ADP">
		| Dumling.Reading<"he", "Lexeme", "ADV">
		| Dumling.Reading<"he", "Lexeme", "AUX">
		| Dumling.Reading<"he", "Lexeme", "CCONJ">
		| Dumling.Reading<"he", "Lexeme", "DET">
		| Dumling.Reading<"he", "Lexeme", "INTJ">
		| Dumling.Reading<"he", "Lexeme", "NOUN">
		| Dumling.Reading<"he", "Lexeme", "NUM">
		| Dumling.Reading<"he", "Lexeme", "X">
		| Dumling.Reading<"he", "Lexeme", "PART">
		| Dumling.Reading<"he", "Lexeme", "PRON">
		| Dumling.Reading<"he", "Lexeme", "PROPN">
		| Dumling.Reading<"he", "Lexeme", "PUNCT">
		| Dumling.Reading<"he", "Lexeme", "SCONJ">
		| Dumling.Reading<"he", "Lexeme", "SYM">
		| Dumling.Reading<"he", "Lexeme", "VERB">
		| Dumling.Reading<"he", "Morpheme", "Circumfix">
		| Dumling.Reading<"he", "Morpheme", "Clitic">
		| Dumling.Reading<"he", "Morpheme", "Duplifix">
		| Dumling.Reading<"he", "Morpheme", "Infix">
		| Dumling.Reading<"he", "Morpheme", "Interfix">
		| Dumling.Reading<"he", "Morpheme", "Prefix">
		| Dumling.Reading<"he", "Morpheme", "Root">
		| Dumling.Reading<"he", "Morpheme", "Suffix">
		| Dumling.Reading<"he", "Morpheme", "Suffixoid">
		| Dumling.Reading<"he", "Morpheme", "ToneMarking">
		| Dumling.Reading<"he", "Morpheme", "Transfix">
		| Dumling.Reading<"he", "Phraseme", "Aphorism">
		| Dumling.Reading<"he", "Phraseme", "DiscourseFormula">
		| Dumling.Reading<"he", "Phraseme", "Idiom">
		| Dumling.Reading<"he", "Phraseme", "Proverb">;
	relation: GovernmentRelation;
	target:
		| (
				| Dumling.Lemma<"de", "Lexeme", "ADJ">
				| Dumling.Lemma<"de", "Lexeme", "ADP">
				| Dumling.Lemma<"de", "Lexeme", "ADV">
				| Dumling.Lemma<"de", "Lexeme", "AUX">
				| Dumling.Lemma<"de", "Lexeme", "CCONJ">
				| Dumling.Lemma<"de", "Lexeme", "DET">
				| Dumling.Lemma<"de", "Lexeme", "INTJ">
				| Dumling.Lemma<"de", "Lexeme", "NOUN">
				| Dumling.Lemma<"de", "Lexeme", "NUM">
				| Dumling.Lemma<"de", "Lexeme", "X">
				| Dumling.Lemma<"de", "Lexeme", "PART">
				| Dumling.Lemma<"de", "Lexeme", "PRON">
				| Dumling.Lemma<"de", "Lexeme", "PROPN">
				| Dumling.Lemma<"de", "Lexeme", "PUNCT">
				| Dumling.Lemma<"de", "Lexeme", "SCONJ">
				| Dumling.Lemma<"de", "Lexeme", "SYM">
				| Dumling.Lemma<"de", "Lexeme", "VERB">
				| Dumling.Lemma<"de", "Morpheme", "Circumfix">
				| Dumling.Lemma<"de", "Morpheme", "Clitic">
				| Dumling.Lemma<"de", "Morpheme", "Duplifix">
				| Dumling.Lemma<"de", "Morpheme", "Infix">
				| Dumling.Lemma<"de", "Morpheme", "Interfix">
				| Dumling.Lemma<"de", "Morpheme", "Prefix">
				| Dumling.Lemma<"de", "Morpheme", "Root">
				| Dumling.Lemma<"de", "Morpheme", "Suffix">
				| Dumling.Lemma<"de", "Morpheme", "Suffixoid">
				| Dumling.Lemma<"de", "Morpheme", "Transfix">
				| Dumling.Lemma<"de", "Phraseme", "Aphorism">
				| Dumling.Lemma<"de", "Phraseme", "Collocation">
				| Dumling.Lemma<"de", "Phraseme", "DiscourseFormula">
				| Dumling.Lemma<"de", "Phraseme", "Idiom">
				| Dumling.Lemma<"de", "Phraseme", "Proverb">
				| Dumling.Lemma<"en", "Lexeme", "ADJ">
				| Dumling.Lemma<"en", "Lexeme", "ADP">
				| Dumling.Lemma<"en", "Lexeme", "ADV">
				| Dumling.Lemma<"en", "Lexeme", "AUX">
				| Dumling.Lemma<"en", "Lexeme", "CCONJ">
				| Dumling.Lemma<"en", "Lexeme", "DET">
				| Dumling.Lemma<"en", "Lexeme", "INTJ">
				| Dumling.Lemma<"en", "Lexeme", "NOUN">
				| Dumling.Lemma<"en", "Lexeme", "NUM">
				| Dumling.Lemma<"en", "Lexeme", "X">
				| Dumling.Lemma<"en", "Lexeme", "PART">
				| Dumling.Lemma<"en", "Lexeme", "PRON">
				| Dumling.Lemma<"en", "Lexeme", "PROPN">
				| Dumling.Lemma<"en", "Lexeme", "PUNCT">
				| Dumling.Lemma<"en", "Lexeme", "SCONJ">
				| Dumling.Lemma<"en", "Lexeme", "SYM">
				| Dumling.Lemma<"en", "Lexeme", "VERB">
				| Dumling.Lemma<"en", "Morpheme", "Circumfix">
				| Dumling.Lemma<"en", "Morpheme", "Clitic">
				| Dumling.Lemma<"en", "Morpheme", "Duplifix">
				| Dumling.Lemma<"en", "Morpheme", "Infix">
				| Dumling.Lemma<"en", "Morpheme", "Interfix">
				| Dumling.Lemma<"en", "Morpheme", "Prefix">
				| Dumling.Lemma<"en", "Morpheme", "Root">
				| Dumling.Lemma<"en", "Morpheme", "Suffix">
				| Dumling.Lemma<"en", "Morpheme", "Suffixoid">
				| Dumling.Lemma<"en", "Morpheme", "ToneMarking">
				| Dumling.Lemma<"en", "Morpheme", "Transfix">
				| Dumling.Lemma<"en", "Phraseme", "Aphorism">
				| Dumling.Lemma<"en", "Phraseme", "DiscourseFormula">
				| Dumling.Lemma<"en", "Phraseme", "Idiom">
				| Dumling.Lemma<"en", "Phraseme", "Proverb">
				| Dumling.Lemma<"he", "Lexeme", "ADJ">
				| Dumling.Lemma<"he", "Lexeme", "ADP">
				| Dumling.Lemma<"he", "Lexeme", "ADV">
				| Dumling.Lemma<"he", "Lexeme", "AUX">
				| Dumling.Lemma<"he", "Lexeme", "CCONJ">
				| Dumling.Lemma<"he", "Lexeme", "DET">
				| Dumling.Lemma<"he", "Lexeme", "INTJ">
				| Dumling.Lemma<"he", "Lexeme", "NOUN">
				| Dumling.Lemma<"he", "Lexeme", "NUM">
				| Dumling.Lemma<"he", "Lexeme", "X">
				| Dumling.Lemma<"he", "Lexeme", "PART">
				| Dumling.Lemma<"he", "Lexeme", "PRON">
				| Dumling.Lemma<"he", "Lexeme", "PROPN">
				| Dumling.Lemma<"he", "Lexeme", "PUNCT">
				| Dumling.Lemma<"he", "Lexeme", "SCONJ">
				| Dumling.Lemma<"he", "Lexeme", "SYM">
				| Dumling.Lemma<"he", "Lexeme", "VERB">
				| Dumling.Lemma<"he", "Morpheme", "Circumfix">
				| Dumling.Lemma<"he", "Morpheme", "Clitic">
				| Dumling.Lemma<"he", "Morpheme", "Duplifix">
				| Dumling.Lemma<"he", "Morpheme", "Infix">
				| Dumling.Lemma<"he", "Morpheme", "Interfix">
				| Dumling.Lemma<"he", "Morpheme", "Prefix">
				| Dumling.Lemma<"he", "Morpheme", "Root">
				| Dumling.Lemma<"he", "Morpheme", "Suffix">
				| Dumling.Lemma<"he", "Morpheme", "Suffixoid">
				| Dumling.Lemma<"he", "Morpheme", "ToneMarking">
				| Dumling.Lemma<"he", "Morpheme", "Transfix">
				| Dumling.Lemma<"he", "Phraseme", "Aphorism">
				| Dumling.Lemma<"he", "Phraseme", "DiscourseFormula">
				| Dumling.Lemma<"he", "Phraseme", "Idiom">
				| Dumling.Lemma<"he", "Phraseme", "Proverb">
		  )
		| (
				| Dumling.Reading<"de", "Lexeme", "ADJ">
				| Dumling.Reading<"de", "Lexeme", "ADP">
				| Dumling.Reading<"de", "Lexeme", "ADV">
				| Dumling.Reading<"de", "Lexeme", "AUX">
				| Dumling.Reading<"de", "Lexeme", "CCONJ">
				| Dumling.Reading<"de", "Lexeme", "DET">
				| Dumling.Reading<"de", "Lexeme", "INTJ">
				| Dumling.Reading<"de", "Lexeme", "NOUN">
				| Dumling.Reading<"de", "Lexeme", "NUM">
				| Dumling.Reading<"de", "Lexeme", "X">
				| Dumling.Reading<"de", "Lexeme", "PART">
				| Dumling.Reading<"de", "Lexeme", "PRON">
				| Dumling.Reading<"de", "Lexeme", "PROPN">
				| Dumling.Reading<"de", "Lexeme", "PUNCT">
				| Dumling.Reading<"de", "Lexeme", "SCONJ">
				| Dumling.Reading<"de", "Lexeme", "SYM">
				| Dumling.Reading<"de", "Lexeme", "VERB">
				| Dumling.Reading<"de", "Morpheme", "Circumfix">
				| Dumling.Reading<"de", "Morpheme", "Clitic">
				| Dumling.Reading<"de", "Morpheme", "Duplifix">
				| Dumling.Reading<"de", "Morpheme", "Infix">
				| Dumling.Reading<"de", "Morpheme", "Interfix">
				| Dumling.Reading<"de", "Morpheme", "Prefix">
				| Dumling.Reading<"de", "Morpheme", "Root">
				| Dumling.Reading<"de", "Morpheme", "Suffix">
				| Dumling.Reading<"de", "Morpheme", "Suffixoid">
				| Dumling.Reading<"de", "Morpheme", "Transfix">
				| Dumling.Reading<"de", "Phraseme", "Aphorism">
				| Dumling.Reading<"de", "Phraseme", "Collocation">
				| Dumling.Reading<"de", "Phraseme", "DiscourseFormula">
				| Dumling.Reading<"de", "Phraseme", "Idiom">
				| Dumling.Reading<"de", "Phraseme", "Proverb">
				| Dumling.Reading<"en", "Lexeme", "ADJ">
				| Dumling.Reading<"en", "Lexeme", "ADP">
				| Dumling.Reading<"en", "Lexeme", "ADV">
				| Dumling.Reading<"en", "Lexeme", "AUX">
				| Dumling.Reading<"en", "Lexeme", "CCONJ">
				| Dumling.Reading<"en", "Lexeme", "DET">
				| Dumling.Reading<"en", "Lexeme", "INTJ">
				| Dumling.Reading<"en", "Lexeme", "NOUN">
				| Dumling.Reading<"en", "Lexeme", "NUM">
				| Dumling.Reading<"en", "Lexeme", "X">
				| Dumling.Reading<"en", "Lexeme", "PART">
				| Dumling.Reading<"en", "Lexeme", "PRON">
				| Dumling.Reading<"en", "Lexeme", "PROPN">
				| Dumling.Reading<"en", "Lexeme", "PUNCT">
				| Dumling.Reading<"en", "Lexeme", "SCONJ">
				| Dumling.Reading<"en", "Lexeme", "SYM">
				| Dumling.Reading<"en", "Lexeme", "VERB">
				| Dumling.Reading<"en", "Morpheme", "Circumfix">
				| Dumling.Reading<"en", "Morpheme", "Clitic">
				| Dumling.Reading<"en", "Morpheme", "Duplifix">
				| Dumling.Reading<"en", "Morpheme", "Infix">
				| Dumling.Reading<"en", "Morpheme", "Interfix">
				| Dumling.Reading<"en", "Morpheme", "Prefix">
				| Dumling.Reading<"en", "Morpheme", "Root">
				| Dumling.Reading<"en", "Morpheme", "Suffix">
				| Dumling.Reading<"en", "Morpheme", "Suffixoid">
				| Dumling.Reading<"en", "Morpheme", "ToneMarking">
				| Dumling.Reading<"en", "Morpheme", "Transfix">
				| Dumling.Reading<"en", "Phraseme", "Aphorism">
				| Dumling.Reading<"en", "Phraseme", "DiscourseFormula">
				| Dumling.Reading<"en", "Phraseme", "Idiom">
				| Dumling.Reading<"en", "Phraseme", "Proverb">
				| Dumling.Reading<"he", "Lexeme", "ADJ">
				| Dumling.Reading<"he", "Lexeme", "ADP">
				| Dumling.Reading<"he", "Lexeme", "ADV">
				| Dumling.Reading<"he", "Lexeme", "AUX">
				| Dumling.Reading<"he", "Lexeme", "CCONJ">
				| Dumling.Reading<"he", "Lexeme", "DET">
				| Dumling.Reading<"he", "Lexeme", "INTJ">
				| Dumling.Reading<"he", "Lexeme", "NOUN">
				| Dumling.Reading<"he", "Lexeme", "NUM">
				| Dumling.Reading<"he", "Lexeme", "X">
				| Dumling.Reading<"he", "Lexeme", "PART">
				| Dumling.Reading<"he", "Lexeme", "PRON">
				| Dumling.Reading<"he", "Lexeme", "PROPN">
				| Dumling.Reading<"he", "Lexeme", "PUNCT">
				| Dumling.Reading<"he", "Lexeme", "SCONJ">
				| Dumling.Reading<"he", "Lexeme", "SYM">
				| Dumling.Reading<"he", "Lexeme", "VERB">
				| Dumling.Reading<"he", "Morpheme", "Circumfix">
				| Dumling.Reading<"he", "Morpheme", "Clitic">
				| Dumling.Reading<"he", "Morpheme", "Duplifix">
				| Dumling.Reading<"he", "Morpheme", "Infix">
				| Dumling.Reading<"he", "Morpheme", "Interfix">
				| Dumling.Reading<"he", "Morpheme", "Prefix">
				| Dumling.Reading<"he", "Morpheme", "Root">
				| Dumling.Reading<"he", "Morpheme", "Suffix">
				| Dumling.Reading<"he", "Morpheme", "Suffixoid">
				| Dumling.Reading<"he", "Morpheme", "ToneMarking">
				| Dumling.Reading<"he", "Morpheme", "Transfix">
				| Dumling.Reading<"he", "Phraseme", "Aphorism">
				| Dumling.Reading<"he", "Phraseme", "DiscourseFormula">
				| Dumling.Reading<"he", "Phraseme", "Idiom">
				| Dumling.Reading<"he", "Phraseme", "Proverb">
		  );
	case: GovernedCase;
	provenance: "direct" | "inferred";
};
