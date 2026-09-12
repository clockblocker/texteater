import { z } from "zod";
import { UNIVERSAL_FEATURE_SCHEMA } from "../../universal/features/catalog.js";
import {
	Aspect,
	Case,
	Definite,
	Degree,
	ExtPos,
	Gender,
	GrammaticalNumber,
	Mood,
	NumType,
	nonEmptyFeatureBagSchema,
	Person,
	Polite,
	PronType,
	Tense,
	VerbForm,
	VerbType,
	Voice,
} from "../../universal/index.js";

// Common
const DeAspectSchema = UNIVERSAL_FEATURE_SCHEMA.aspect.extract([Aspect.Perf]);
const DeGenderSchema = UNIVERSAL_FEATURE_SCHEMA.gender.extract([
	Gender.Fem,
	Gender.Masc,
	Gender.Neut,
]);
const DeMoodSchema = UNIVERSAL_FEATURE_SCHEMA.mood.extract([
	Mood.Ind,
	Mood.Sub,
]);
const DeImperativeMoodSchema = UNIVERSAL_FEATURE_SCHEMA.mood.extract([
	Mood.Imp,
]);
const DeNumberSchema = UNIVERSAL_FEATURE_SCHEMA.number.extract([
	GrammaticalNumber.Plur,
	GrammaticalNumber.Sing,
]);
const DePersonSchema = UNIVERSAL_FEATURE_SCHEMA.person.extract([
	Person["1"],
	Person["2"],
	Person["3"],
]);
const DeTenseSchema = UNIVERSAL_FEATURE_SCHEMA.tense.extract([
	Tense.Past,
	Tense.Pres,
]);
const DeVoiceSchema = UNIVERSAL_FEATURE_SCHEMA.voice.extract([Voice.Pass]);
const DeFiniteFormSchema = UNIVERSAL_FEATURE_SCHEMA.verbForm.extract([
	VerbForm.Fin,
]);
const DeInfinitiveFormSchema = UNIVERSAL_FEATURE_SCHEMA.verbForm.extract([
	VerbForm.Inf,
]);
const DeParticipleFormSchema = UNIVERSAL_FEATURE_SCHEMA.verbForm.extract([
	VerbForm.Part,
]);
const DeHasGovPrepSchema = UNIVERSAL_FEATURE_SCHEMA.hasGovPrep;
const DeHasSepPrefixSchema = UNIVERSAL_FEATURE_SCHEMA.hasSepPrefix;
const DeLexicallyReflexiveSchema = UNIVERSAL_FEATURE_SCHEMA.lexicallyReflexive;
const DeModalVerbTypeSchema = UNIVERSAL_FEATURE_SCHEMA.verbType.extract([
	VerbType.Mod,
]);
const DeCaseSchema = UNIVERSAL_FEATURE_SCHEMA.case.extract([
	Case.Acc,
	Case.Dat,
	Case.Gen,
	Case.Nom,
]);
const DeDefiniteSchema = UNIVERSAL_FEATURE_SCHEMA.definite.extract([
	Definite.Def,
	Definite.Ind,
]);
const DeDegreeSchema = UNIVERSAL_FEATURE_SCHEMA.degree.extract([
	Degree.Cmp,
	Degree.Pos,
	Degree.Sup,
]);
const DeDeterminerExtPosSchema = UNIVERSAL_FEATURE_SCHEMA.extPos.extract([
	ExtPos.ADV,
	ExtPos.DET,
]);
const DeNumTypeSchema = UNIVERSAL_FEATURE_SCHEMA.numType.extract([
	NumType.Card,
	NumType.Ord,
]);
const DePoliteSchema = UNIVERSAL_FEATURE_SCHEMA.polite.extract([
	Polite.Form,
	Polite.Infm,
]);
const DeDeterminerPronTypeSchema = UNIVERSAL_FEATURE_SCHEMA.pronType.extract([
	PronType.Art,
	PronType.Dem,
	PronType.Emp,
	PronType.Exc,
	PronType.Ind,
	PronType.Int,
	PronType.Neg,
	PronType.Prs,
	PronType.Rel,
	PronType.Tot,
]);

export const DE_FEATURE_SCHEMA = {
	...UNIVERSAL_FEATURE_SCHEMA,
	aspect: DeAspectSchema,
	gender: DeGenderSchema,
	finiteMood: DeMoodSchema,
	imperativeMood: DeImperativeMoodSchema,
	number: DeNumberSchema,
	person: DePersonSchema,
	tense: DeTenseSchema,
	voice: DeVoiceSchema,
	finiteForm: DeFiniteFormSchema,
	infinitiveForm: DeInfinitiveFormSchema,
	participleForm: DeParticipleFormSchema,
	hasGovPrep: DeHasGovPrepSchema,
	hasSepPrefix: DeHasSepPrefixSchema,
	lexicallyReflexive: DeLexicallyReflexiveSchema,
	modalVerbType: DeModalVerbTypeSchema,
	case: DeCaseSchema,
	definite: DeDefiniteSchema,
	degree: DeDegreeSchema,
	determinerExtPos: DeDeterminerExtPosSchema,
	foreign: UNIVERSAL_FEATURE_SCHEMA.foreign,
	determinerNumType: DeNumTypeSchema,
	polite: DePoliteSchema,
	poss: UNIVERSAL_FEATURE_SCHEMA.poss,
	determinerPronType: DeDeterminerPronTypeSchema,
} as const;

// Verbal
const DeVerbalUnspecifiedFormFeatureBagSchema = nonEmptyFeatureBagSchema(
	z.strictObject({
		number: DE_FEATURE_SCHEMA.number.nullable(),
		tense: DE_FEATURE_SCHEMA.tense.nullable(),
		verbForm: z.null(),
		voice: DE_FEATURE_SCHEMA.voice.nullable(),
	}),
);

const DeVerbalImperativeFeatureBagSchema = z.strictObject({
	mood: DE_FEATURE_SCHEMA.imperativeMood,
	number: DE_FEATURE_SCHEMA.number.nullable(),
	person: DE_FEATURE_SCHEMA.person.nullable(),
	tense: z.null(),
	verbForm: DE_FEATURE_SCHEMA.finiteForm,
	voice: DE_FEATURE_SCHEMA.voice.nullable(),
});

const DeVerbalFiniteFeatureBagSchema = z.strictObject({
	mood: DE_FEATURE_SCHEMA.finiteMood.nullable(),
	number: DE_FEATURE_SCHEMA.number.nullable(),
	person: DE_FEATURE_SCHEMA.person.nullable(),
	tense: DE_FEATURE_SCHEMA.tense.nullable(),
	verbForm: DE_FEATURE_SCHEMA.finiteForm,
	voice: DE_FEATURE_SCHEMA.voice.nullable(),
});

const DeVerbalInfinitiveFeatureBagSchema = z.strictObject({
	mood: z.null(),
	number: DE_FEATURE_SCHEMA.number.nullable(),
	person: z.null(),
	tense: z.null(),
	verbForm: DE_FEATURE_SCHEMA.infinitiveForm,
	voice: DE_FEATURE_SCHEMA.voice.nullable(),
});

const DeVerbalParticipleFeatureBagSchema = z.strictObject({
	aspect: DE_FEATURE_SCHEMA.aspect.nullable(),
	gender: DE_FEATURE_SCHEMA.gender.nullable(),
	mood: z.null(),
	number: DE_FEATURE_SCHEMA.number.nullable(),
	person: z.null(),
	tense: DE_FEATURE_SCHEMA.tense.nullable(),
	verbForm: DE_FEATURE_SCHEMA.participleForm,
	voice: DE_FEATURE_SCHEMA.voice.nullable(),
});

export const DeVerbalInflectionalFeatureBagSchema = z.union([
	DeVerbalUnspecifiedFormFeatureBagSchema,
	DeVerbalImperativeFeatureBagSchema,
	DeVerbalFiniteFeatureBagSchema,
	DeVerbalInfinitiveFeatureBagSchema,
	DeVerbalParticipleFeatureBagSchema,
]);

export type DeVerbalInflectionalFeatureBag = z.infer<
	typeof DeVerbalInflectionalFeatureBagSchema
>;
