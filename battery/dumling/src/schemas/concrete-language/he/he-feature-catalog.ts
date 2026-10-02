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

export const HE_FEATURE_SCHEMA = {
	...UNIVERSAL_FEATURE_SCHEMA,
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
