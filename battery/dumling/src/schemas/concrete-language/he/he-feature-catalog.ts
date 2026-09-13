import { UNIVERSAL_FEATURE_SCHEMA } from "../../universal/features/catalog.js";
import {
	Definite,
	Gender,
	GrammaticalNumber,
	Mood,
	Person,
	Polarity,
	Tense,
	VerbForm,
	Voice,
} from "../../universal/index.js";

const HeAbbrSchema = UNIVERSAL_FEATURE_SCHEMA.abbr;
const HeDefiniteSchema = UNIVERSAL_FEATURE_SCHEMA.definite.extract([
	Definite.Cons,
	Definite.Def,
]);
const HeGenderSchema = UNIVERSAL_FEATURE_SCHEMA.gender.extract([
	Gender.Fem,
	Gender.Masc,
]);
const HeNumberSchema = UNIVERSAL_FEATURE_SCHEMA.number.extract([
	GrammaticalNumber.Plur,
	GrammaticalNumber.Sing,
]);
const HeNumberWithDualSchema = UNIVERSAL_FEATURE_SCHEMA.number.extract([
	GrammaticalNumber.Dual,
	GrammaticalNumber.Plur,
	GrammaticalNumber.Sing,
]);
const HeMoodSchema = UNIVERSAL_FEATURE_SCHEMA.mood.extract([Mood.Imp]);
const HePersonSchema = UNIVERSAL_FEATURE_SCHEMA.person.extract([
	Person["1"],
	Person["2"],
	Person["3"],
]);
const HePolaritySchema = UNIVERSAL_FEATURE_SCHEMA.polarity.extract([
	Polarity.Neg,
	Polarity.Pos,
]);
const HeTenseSchema = UNIVERSAL_FEATURE_SCHEMA.tense.extract([
	Tense.Fut,
	Tense.Past,
]);
const HeVerbFormSchema = UNIVERSAL_FEATURE_SCHEMA.verbForm.extract([
	VerbForm.Inf,
	VerbForm.Part,
]);
const HeVoiceSchema = UNIVERSAL_FEATURE_SCHEMA.voice.extract([
	Voice.Act,
	Voice.Mid,
	Voice.Pass,
]);

export const HE_FEATURE_SCHEMA = {
	...UNIVERSAL_FEATURE_SCHEMA,
	abbr: HeAbbrSchema,
	definite: HeDefiniteSchema,
	nominalDefinite: UNIVERSAL_FEATURE_SCHEMA.definite.extract([
		Definite.Cons,
		Definite.Def,
		Definite.Ind,
	]),
	gender: HeGenderSchema,
	hebBinyan: UNIVERSAL_FEATURE_SCHEMA.hebBinyan,
	hebExistential: UNIVERSAL_FEATURE_SCHEMA.hebExistential,
	mood: HeMoodSchema,
	number: HeNumberSchema,
	numberWithDual: HeNumberWithDualSchema,
	person: HePersonSchema,
	polarity: HePolaritySchema,
	tense: HeTenseSchema,
	verbForm: HeVerbFormSchema,
	voice: HeVoiceSchema,
} as const;
