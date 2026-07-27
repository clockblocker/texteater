import type { z } from "zod/v3";
import { DiscourseFormulaRole } from "./custom/discourse-formula-role";
import { GovernedCase } from "./custom/governed-case";
import { HasGovPrep } from "./custom/governed-preposition";
import { LexicallyReflexive } from "./custom/lexically-reflexive";
import { Phrasal } from "./custom/phrasal";
import { HasSepPrefix } from "./custom/separable";
import { Abbr } from "./ud/abbr";
import { AdpType } from "./ud/adp-type";
import { Animacy } from "./ud/animacy";
import { Aspect } from "./ud/aspect";
import { Case } from "./ud/case";
import { Clusivity } from "./ud/clusivity";
import { ConjType } from "./ud/conj-type";
import { Definite } from "./ud/definite";
import { Degree } from "./ud/degree";
import { Deixis } from "./ud/deixis";
import { DeixisRef } from "./ud/deixis-ref";
import { Evident } from "./ud/evident";
import { ExtPos } from "./ud/ext-pos";
import { Foreign } from "./ud/foreign";
import { Gender } from "./ud/gender";
import { HebBinyan } from "./ud/heb-binyan";
import { HebExistential } from "./ud/heb-existential";
import { Hyph } from "./ud/hyph";
import { Mood } from "./ud/mood";
import { NounClass } from "./ud/noun-class";
import { NumForm } from "./ud/num-form";
import { NumType } from "./ud/num-type";
import { GrammaticalNumber } from "./ud/number";
import { PartType } from "./ud/part-type";
import { Person } from "./ud/person";
import { Polarity } from "./ud/polarity";
import { Polite } from "./ud/polite";
import { Poss } from "./ud/poss";
import { Prefix } from "./ud/prefix";
import { PronType } from "./ud/pron-type";
import { PunctType } from "./ud/punct-type";
import { Reflex } from "./ud/reflex";
import { Style } from "./ud/style";
import { Tense } from "./ud/tense";
import { Variant } from "./ud/variant";
import { VerbForm } from "./ud/verb-form";
import { VerbType } from "./ud/verb-type";
import { Voice } from "./ud/voice";

type FeatureValueSet<T> = T | readonly [T, ...T[]];
type SchemaOutput<TSchema extends z.ZodTypeAny> = z.output<TSchema>;

export const abstractFeatureCatalog = {
	abbr: Abbr,
	adpType: AdpType,
	animacy: Animacy,
	aspect: Aspect,
	case: Case,
	clusivity: Clusivity,
	conjType: ConjType,
	definite: Definite,
	degree: Degree,
	deixis: Deixis,
	deixisRef: DeixisRef,
	discourseFormulaRole: DiscourseFormulaRole,
	evident: Evident,
	extPos: ExtPos,
	foreign: Foreign,
	gender: Gender,
	"gender[psor]": Gender,
	governedCase: GovernedCase,
	hasGovPrep: HasGovPrep,
	hasSepPrefix: HasSepPrefix,
	hebBinyan: HebBinyan,
	hebExistential: HebExistential,
	hyph: Hyph,
	lexicallyReflexive: LexicallyReflexive,
	mood: Mood,
	nounClass: NounClass,
	numForm: NumForm,
	number: GrammaticalNumber,
	"number[psor]": GrammaticalNumber,
	numType: NumType,
	partType: PartType,
	person: Person,
	phrasal: Phrasal,
	polarity: Polarity,
	polite: Polite,
	poss: Poss,
	prefix: Prefix,
	pronType: PronType,
	punctType: PunctType,
	reflex: Reflex,
	style: Style,
	tense: Tense,
	variant: Variant,
	verbForm: VerbForm,
	verbType: VerbType,
	voice: Voice,
} as const;

export type AbstractFeatureAtoms = {
	[TName in keyof typeof abstractFeatureCatalog]: SchemaOutput<
		(typeof abstractFeatureCatalog)[TName]
	>;
};

export type AbstractInherentFeatures = {
	[TName in keyof AbstractFeatureAtoms]?: FeatureValueSet<
		AbstractFeatureAtoms[TName]
	>;
};

export type AbstractInflectionalFeatures = {
	[TName in keyof AbstractFeatureAtoms]?: FeatureValueSet<
		AbstractFeatureAtoms[TName]
	>;
};

export type AbstractFeatureName = keyof AbstractFeatureAtoms;
export type AbstractFeatureValue<N extends AbstractFeatureName> =
	AbstractFeatureAtoms[N];
