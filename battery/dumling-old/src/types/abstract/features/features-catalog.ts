import { DiscourseFormulaRole } from "./custom/discourse-formula-role.js";
import { GovernedCase } from "./custom/governed-case.js";
import { HasGovPrep } from "./custom/governed-preposition.js";
import { LexicallyReflexive } from "./custom/lexically-reflexive.js";
import { Phrasal } from "./custom/phrasal.js";
import { HasSepPrefix } from "./custom/separable.js";
import { Abbr } from "./ud/abbr.js";
import { AdpType } from "./ud/adp-type.js";
import { Animacy } from "./ud/animacy.js";
import { Aspect } from "./ud/aspect.js";
import { Case } from "./ud/case.js";
import { Clusivity } from "./ud/clusivity.js";
import { ConjType } from "./ud/conj-type.js";
import { Definite } from "./ud/definite.js";
import { Degree } from "./ud/degree.js";
import { Deixis } from "./ud/deixis.js";
import { DeixisRef } from "./ud/deixis-ref.js";
import { Evident } from "./ud/evident.js";
import { ExtPos } from "./ud/ext-pos.js";
import { Foreign } from "./ud/foreign.js";
import { Gender } from "./ud/gender.js";
import { HebBinyan } from "./ud/heb-binyan.js";
import { HebExistential } from "./ud/heb-existential.js";
import { Hyph } from "./ud/hyph.js";
import { Mood } from "./ud/mood.js";
import { NounClass } from "./ud/noun-class.js";
import { NumForm } from "./ud/num-form.js";
import { NumType } from "./ud/num-type.js";
import { GrammaticalNumber } from "./ud/number.js";
import { PartType } from "./ud/part-type.js";
import { Person } from "./ud/person.js";
import { Polarity } from "./ud/polarity.js";
import { Polite } from "./ud/polite.js";
import { Poss } from "./ud/poss.js";
import { Prefix } from "./ud/prefix.js";
import { PronType } from "./ud/pron-type.js";
import { PunctType } from "./ud/punct-type.js";
import { Reflex } from "./ud/reflex.js";
import { Style } from "./ud/style.js";
import { Tense } from "./ud/tense.js";
import { Variant } from "./ud/variant.js";
import { VerbForm } from "./ud/verb-form.js";
import { VerbType } from "./ud/verb-type.js";
import { Voice } from "./ud/voice.js";

type FeatureValueSet<T> = T | readonly [T, ...T[]];
export type AbstractFeatureAtomDefinition = readonly string[] | null;

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

type AbstractFeatureAtoms = {
	[TName in keyof typeof abstractFeatureCatalog]: (typeof abstractFeatureCatalog)[TName] extends readonly (infer Value extends
		string)[]
		? Value
		: string;
};

export type AbstractCoreFeatures = {
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
