import { z } from "zod/v3";

const supportedLanguageValues = ["en", "de", "he"] as const;

export const SupportedLanguage = z.enum(supportedLanguageValues);
export type SupportedLanguage = z.infer<typeof SupportedLanguage>;

export const AbstractLanguageTag = z.string().min(1);
export type AbstractLanguageTag = string;

const lemmaKindValues = [
	"Phraseme",
	"Lexeme",
	"Morpheme",
	"Construction",
] as const;

export const LemmaKind = z.enum(lemmaKindValues);
export type LemmaKind = z.infer<typeof LemmaKind>;

const surfaceKindValues = ["Citation", "Inflection"] as const;

export const SurfaceKind = z.enum(surfaceKindValues);
export type SurfaceKind = z.infer<typeof SurfaceKind>;

const orthographicStatusValues = ["Standard", "Typo"] as const;

export const OrthographicStatus = z.enum(orthographicStatusValues);
export type OrthographicStatus = z.infer<typeof OrthographicStatus>;

const selectionCoverageValues = ["Full", "Partial"] as const;

export const SelectionCoverage = z.enum(selectionCoverageValues);
export type SelectionCoverage = z.infer<typeof SelectionCoverage>;

const spellingRelationValues = ["Canonical", "Variant"] as const;

export const SpellingRelation = z.enum(spellingRelationValues);
export type SpellingRelation = z.infer<typeof SpellingRelation>;

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

const lemmaSubKindValues = [
	...posValues,
	...phrasemeKindValues,
	...morphemeKindValues,
	...constructionKindValues,
] as const;

export const LemmaSubKind = z.enum(lemmaSubKindValues);
export type LemmaSubKind = z.infer<typeof LemmaSubKind>;
