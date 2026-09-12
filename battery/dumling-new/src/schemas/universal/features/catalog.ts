import type { z } from "zod";
import { DiscourseFormulaRoleSchema } from "./custom/discourse-formula-role.js";
import { GovernedCaseSchema } from "./custom/governed-case.js";
import { HasGovPrepSchema } from "./custom/governed-preposition.js";
import { LexicallyReflexiveSchema } from "./custom/lexically-reflexive.js";
import { PhrasalSchema } from "./custom/phrasal.js";
import { HasSepPrefixSchema } from "./custom/separable.js";
import { AbbrSchema } from "./ud/abbr.js";
import { AdpTypeSchema } from "./ud/adp-type.js";
import { AnimacySchema } from "./ud/animacy.js";
import { AspectSchema } from "./ud/aspect.js";
import { CaseSchema } from "./ud/case.js";
import { ClusivitySchema } from "./ud/clusivity.js";
import { ConjTypeSchema } from "./ud/conj-type.js";
import { DefiniteSchema } from "./ud/definite.js";
import { DegreeSchema } from "./ud/degree.js";
import { DeixisSchema } from "./ud/deixis.js";
import { DeixisRefSchema } from "./ud/deixis-ref.js";
import { EvidentSchema } from "./ud/evident.js";
import { ExtPosSchema } from "./ud/ext-pos.js";
import { ForeignSchema } from "./ud/foreign.js";
import { GenderSchema } from "./ud/gender.js";
import { HebBinyanSchema } from "./ud/heb-binyan.js";
import { HebExistentialSchema } from "./ud/heb-existential.js";
import { HyphSchema } from "./ud/hyph.js";
import { MoodSchema } from "./ud/mood.js";
import { NounClassSchema } from "./ud/noun-class.js";
import { NumFormSchema } from "./ud/num-form.js";
import { NumTypeSchema } from "./ud/num-type.js";
import { GrammaticalNumberSchema } from "./ud/number.js";
import { PartTypeSchema } from "./ud/part-type.js";
import { PersonSchema } from "./ud/person.js";
import { PolaritySchema } from "./ud/polarity.js";
import { PoliteSchema } from "./ud/polite.js";
import { PossSchema } from "./ud/poss.js";
import { PrefixSchema } from "./ud/prefix.js";
import { PronTypeSchema } from "./ud/pron-type.js";
import { PunctTypeSchema } from "./ud/punct-type.js";
import { ReflexSchema } from "./ud/reflex.js";
import { StyleSchema } from "./ud/style.js";
import { TenseSchema } from "./ud/tense.js";
import { VariantSchema } from "./ud/variant.js";
import { VerbFormSchema } from "./ud/verb-form.js";
import { VerbTypeSchema } from "./ud/verb-type.js";
import { VoiceSchema } from "./ud/voice.js";

export const DUMLING_FEATURE_SCHEMA = {
	abbr: AbbrSchema,
	adpType: AdpTypeSchema,
	animacy: AnimacySchema,
	aspect: AspectSchema,
	case: CaseSchema,
	clusivity: ClusivitySchema,
	conjType: ConjTypeSchema,
	definite: DefiniteSchema,
	degree: DegreeSchema,
	deixis: DeixisSchema,
	deixisRef: DeixisRefSchema,
	discourseFormulaRole: DiscourseFormulaRoleSchema,
	evident: EvidentSchema,
	extPos: ExtPosSchema,
	foreign: ForeignSchema,
	gender: GenderSchema,
	"gender[psor]": GenderSchema,
	governedCase: GovernedCaseSchema,
	hasGovPrep: HasGovPrepSchema,
	hasSepPrefix: HasSepPrefixSchema,
	hebBinyan: HebBinyanSchema,
	hebExistential: HebExistentialSchema,
	hyph: HyphSchema,
	lexicallyReflexive: LexicallyReflexiveSchema,
	mood: MoodSchema,
	nounClass: NounClassSchema,
	numForm: NumFormSchema,
	number: GrammaticalNumberSchema,
	"number[psor]": GrammaticalNumberSchema,
	numType: NumTypeSchema,
	partType: PartTypeSchema,
	person: PersonSchema,
	phrasal: PhrasalSchema,
	polarity: PolaritySchema,
	polite: PoliteSchema,
	poss: PossSchema,
	prefix: PrefixSchema,
	pronType: PronTypeSchema,
	punctType: PunctTypeSchema,
	reflex: ReflexSchema,
	style: StyleSchema,
	tense: TenseSchema,
	variant: VariantSchema,
	verbForm: VerbFormSchema,
	verbType: VerbTypeSchema,
	voice: VoiceSchema,
} as const;

type UniversalFeatureAtoms = {
	[Name in keyof typeof DUMLING_FEATURE_SCHEMA]: z.infer<
		(typeof DUMLING_FEATURE_SCHEMA)[Name]
	>;
};

export type UniversalFeatureName = keyof UniversalFeatureAtoms;
export type UniversalFeatureValue<Name extends UniversalFeatureName> =
	UniversalFeatureAtoms[Name];
