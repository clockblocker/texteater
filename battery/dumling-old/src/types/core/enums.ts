import { surfaceKindValues } from "../../vocabulary.js";

export type SupportedLanguage = "en" | "de" | "he";

export const lemmaFamilyValues = [
	"Phraseme",
	"Lexeme",
	"Morpheme",
	"Construction",
] as const;
export type LemmaFamily = (typeof lemmaFamilyValues)[number];

export { surfaceKindValues };
export type SurfaceKind = (typeof surfaceKindValues)[number];

const openClassPosValues = [
	"ADJ",
	"ADV",
	"INTJ",
	"NOUN",
	"PROPN",
	"VERB",
] as const;
const closedClassPosValues = [
	"ADP",
	"AUX",
	"CCONJ",
	"DET",
	"NUM",
	"PART",
	"PRON",
	"SCONJ",
] as const;
const otherPosValues = ["PUNCT", "SYM", "X"] as const;
export const posValues = [
	...openClassPosValues,
	...closedClassPosValues,
	...otherPosValues,
] as const;
export type Pos = (typeof posValues)[number];

export const phrasemeKindValues = [
	"DiscourseFormula",
	"Aphorism",
	"Proverb",
	"Idiom",
	"Collocation",
] as const;
export type PhrasemeKind = (typeof phrasemeKindValues)[number];

export const morphemeKindValues = [
	"Root",
	"Prefix",
	"Suffix",
	"Suffixoid",
	"Infix",
	"Circumfix",
	"Interfix",
	"Transfix",
	"Clitic",
	"ToneMarking",
	"Duplifix",
] as const;
export type MorphemeKind = (typeof morphemeKindValues)[number];

export const constructionKindValues = ["Fusion"] as const;
export type ConstructionKind = (typeof constructionKindValues)[number];

export const lemmaKindValues = [
	...posValues,
	...phrasemeKindValues,
	...morphemeKindValues,
	...constructionKindValues,
] as const;
export type LemmaKind = (typeof lemmaKindValues)[number];
