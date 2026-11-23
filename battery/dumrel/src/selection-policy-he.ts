import type { KnowledgePolicy } from "./knowledge-policies.js";

const text = {
	transcription: null,
	definition: null,
	translations: { en: null, ru: null },
} as const;
const inflected = { ...text, hebrewParadigm: null } as const;
const framed = { ...inflected, valency: null } as const;

/** Hebrew-owned policy: no German plural, conjugation class or principal parts. */
export const HE_REL_MAP = {
	Lexeme: {
		ADJ: framed,
		ADP: text,
		ADV: text,
		AUX: inflected,
		CCONJ: text,
		DET: inflected,
		INTJ: { ...text, formulaRole: null },
		NOUN: framed,
		NUM: inflected,
		PART: text,
		PRON: inflected,
		PROPN: inflected,
		PUNCT: text,
		SCONJ: text,
		SYM: text,
		VERB: framed,
	},
	Locution: {
		ADV: { ...text, locutionType: null },
		INTJ: { ...text, locutionType: null, formulaRole: null },
	},
	Saying: { Saying: { ...text, sayingType: null } },
	Foreign: { Foreign: { translations: { en: null, ru: null } } },
	Morpheme: {
		Circumfix: text,
		Duplifix: text,
		Infix: text,
		Interfix: text,
		Prefix: text,
		Root: text,
		Suffix: text,
		Suffixoid: text,
		Transfix: text,
	},
} satisfies KnowledgePolicy<"he">;
