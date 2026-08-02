import { z } from "zod";

const supportedLanguageValues = ["en", "de", "he"] as const;

export const SupportedLanguage = z.enum(supportedLanguageValues);
export type SupportedLanguage = z.infer<typeof SupportedLanguage>;

export const AbstractLanguageTag = z.string().min(1);
export type AbstractLanguageTag = string;

const familyValues = [
	"Phraseme",
	"Lexeme",
	"Morpheme",
	"Construction",
] as const;

export const LemmaFamily = z.enum(familyValues);
export type LemmaFamily = z.infer<typeof LemmaFamily>;

const surfaceKindValues = ["Citation", "Inflection"] as const;

export const SurfaceKind = z.enum(surfaceKindValues);
export type SurfaceKind = z.infer<typeof SurfaceKind>;

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
const posValues = [
	...openClassPosValues,
	...closedClassPosValues,
	...otherPosValues,
] as const;

export const Pos = z.enum(posValues);
export type Pos = z.infer<typeof Pos>;

const phrasemeKindValues = [
	"DiscourseFormula",
	"Aphorism",
	"Proverb",
	"Idiom",
	"Collocation",
] as const;

export const PhrasemeKind = z.enum(phrasemeKindValues);
export type PhrasemeKind = z.infer<typeof PhrasemeKind>;

const morphemeKindValues = [
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

export const MorphemeKind = z.enum(morphemeKindValues);
export type MorphemeKind = z.infer<typeof MorphemeKind>;

const constructionKindValues = ["Fusion", "PairedFrame"] as const;

export const ConstructionKind = z.enum(constructionKindValues);
export type ConstructionKind = z.infer<typeof ConstructionKind>;

const kindValues = [
	...posValues,
	...phrasemeKindValues,
	...morphemeKindValues,
	...constructionKindValues,
] as const;

export const LemmaKind = z.enum(kindValues);
export type LemmaKind = z.infer<typeof LemmaKind>;
