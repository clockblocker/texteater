import { UNIVERSAL_FEATURE_SCHEMA } from "../../universal/features/catalog.js";

const HeDefiniteSchema = UNIVERSAL_FEATURE_SCHEMA.definite.extract([
	"Cons",
	"Def",
]);
const HeGenderSchema = UNIVERSAL_FEATURE_SCHEMA.gender.extract(["Fem", "Masc"]);
const HeNumberSchema = UNIVERSAL_FEATURE_SCHEMA.number.extract([
	"Plur",
	"Sing",
]);
const HeNumberWithDualSchema = UNIVERSAL_FEATURE_SCHEMA.number.extract([
	"Dual",
	"Plur",
	"Sing",
]);
const HeMoodSchema = UNIVERSAL_FEATURE_SCHEMA.mood.extract(["Imp"]);
const HePersonSchema = UNIVERSAL_FEATURE_SCHEMA.person.extract(["1", "2", "3"]);
const HePolaritySchema = UNIVERSAL_FEATURE_SCHEMA.polarity.extract([
	"Neg",
	"Pos",
]);
const HeTenseSchema = UNIVERSAL_FEATURE_SCHEMA.tense.extract(["Fut", "Past"]);
const HeVerbFormSchema = UNIVERSAL_FEATURE_SCHEMA.verbForm.extract([
	"Inf",
	"Part",
]);
const HeVoiceSchema = UNIVERSAL_FEATURE_SCHEMA.voice.extract([
	"Act",
	"Mid",
	"Pass",
]);

// The Hebrew Feature Pool (system ADR 0032): Hebrew picks from the universal
// pool only the features its routes use, some narrowed here to Hebrew's values.
export const HE_FEATURE_SCHEMA = {
	abbr: UNIVERSAL_FEATURE_SCHEMA.abbr,
	article: UNIVERSAL_FEATURE_SCHEMA.article,
	case: UNIVERSAL_FEATURE_SCHEMA.case,
	hebBinyan: UNIVERSAL_FEATURE_SCHEMA.hebBinyan,
	hebExistential: UNIVERSAL_FEATURE_SCHEMA.hebExistential,
	prefix: UNIVERSAL_FEATURE_SCHEMA.prefix,
	pronType: UNIVERSAL_FEATURE_SCHEMA.pronType,
	reflex: UNIVERSAL_FEATURE_SCHEMA.reflex,
	sourceLang: UNIVERSAL_FEATURE_SCHEMA.sourceLang,
	verbType: UNIVERSAL_FEATURE_SCHEMA.verbType,
	definite: HeDefiniteSchema,
	nominalDefinite: UNIVERSAL_FEATURE_SCHEMA.definite.extract([
		"Cons",
		"Def",
		"Ind",
	]),
	gender: HeGenderSchema,
	mood: HeMoodSchema,
	number: HeNumberSchema,
	numberWithDual: HeNumberWithDualSchema,
	person: HePersonSchema,
	polarity: HePolaritySchema,
	tense: HeTenseSchema,
	verbForm: HeVerbFormSchema,
	voice: HeVoiceSchema,
} as const;
