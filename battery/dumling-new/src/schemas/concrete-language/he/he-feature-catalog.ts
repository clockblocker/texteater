import { UNIVERSAL_FEATURE_SCHEMA } from "../../universal/features/catalog.js";
import { Definite, Gender, GrammaticalNumber } from "../../universal/index.js";

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

export const HE_FEATURE_SCHEMA = {
	abbr: HeAbbrSchema,
	definite: HeDefiniteSchema,
	gender: HeGenderSchema,
	number: HeNumberSchema,
} as const;
