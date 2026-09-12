import { z } from "zod";
import {
	Aspect,
	DUMLING_FEATURE_SCHEMA,
	Gender,
	GrammaticalNumber,
	Mood,
	Person,
	Tense,
	VerbForm,
	VerbType,
	Voice,
} from "../../../universal/index.js";

const DeVerbAspectSchema = DUMLING_FEATURE_SCHEMA.aspect.extract([Aspect.Perf]);
const DeVerbGenderSchema = DUMLING_FEATURE_SCHEMA.gender.extract([
	Gender.Fem,
	Gender.Masc,
	Gender.Neut,
]);
const DeVerbMoodSchema = DUMLING_FEATURE_SCHEMA.mood.extract([
	Mood.Ind,
	Mood.Sub,
]);
const DeVerbNumberSchema = DUMLING_FEATURE_SCHEMA.number.extract([
	GrammaticalNumber.Plur,
	GrammaticalNumber.Sing,
]);
const DeVerbPersonSchema = DUMLING_FEATURE_SCHEMA.person.extract([
	Person["1"],
	Person["2"],
	Person["3"],
]);
const DeVerbTenseSchema = DUMLING_FEATURE_SCHEMA.tense.extract([
	Tense.Past,
	Tense.Pres,
]);
const DeVerbVoiceSchema = DUMLING_FEATURE_SCHEMA.voice.extract([Voice.Pass]);

const DeVerbUnspecifiedFormFeaturesSchema = z
	.strictObject({
		number: DeVerbNumberSchema.nullable(),
		tense: DeVerbTenseSchema.nullable(),
		verbForm: z.null(),
		voice: DeVerbVoiceSchema.nullable(),
	})
	.refine(
		({ number, tense, voice }) =>
			number !== null || tense !== null || voice !== null,
		{
			error: "inflectionalFeatures must not be empty",
		},
	);

const DeVerbImperativeFeaturesSchema = z.strictObject({
	mood: DUMLING_FEATURE_SCHEMA.mood.extract([Mood.Imp]),
	number: DeVerbNumberSchema.nullable(),
	person: DeVerbPersonSchema.nullable(),
	tense: z.null(),
	verbForm: DUMLING_FEATURE_SCHEMA.verbForm.extract([VerbForm.Fin]),
	voice: DeVerbVoiceSchema.nullable(),
});

const DeVerbFiniteFeaturesSchema = z.strictObject({
	mood: DeVerbMoodSchema.nullable(),
	number: DeVerbNumberSchema.nullable(),
	person: DeVerbPersonSchema.nullable(),
	tense: DeVerbTenseSchema.nullable(),
	verbForm: DUMLING_FEATURE_SCHEMA.verbForm.extract([VerbForm.Fin]),
	voice: DeVerbVoiceSchema.nullable(),
});

const DeVerbInfinitiveFeaturesSchema = z.strictObject({
	mood: z.null(),
	number: DeVerbNumberSchema.nullable(),
	person: z.null(),
	tense: z.null(),
	verbForm: DUMLING_FEATURE_SCHEMA.verbForm.extract([VerbForm.Inf]),
	voice: DeVerbVoiceSchema.nullable(),
});

const DeVerbParticipleFeaturesSchema = z.strictObject({
	aspect: DeVerbAspectSchema.nullable(),
	gender: DeVerbGenderSchema.nullable(),
	mood: z.null(),
	number: DeVerbNumberSchema.nullable(),
	person: z.null(),
	tense: DeVerbTenseSchema.nullable(),
	verbForm: DUMLING_FEATURE_SCHEMA.verbForm.extract([VerbForm.Part]),
	voice: DeVerbVoiceSchema.nullable(),
});

const DeVerbCoreFeaturesSchema = z.strictObject({
	hasGovPrep: DUMLING_FEATURE_SCHEMA.hasGovPrep.nullable(),
	hasSepPrefix: DUMLING_FEATURE_SCHEMA.hasSepPrefix.nullable(),
	lexicallyReflexive: DUMLING_FEATURE_SCHEMA.lexicallyReflexive.nullable(),
	verbType: DUMLING_FEATURE_SCHEMA.verbType
		.extract([VerbType.Mod])
		.nullable(),
});

const DeVerbInflectionalFeaturesSchema = z.union([
	DeVerbUnspecifiedFormFeaturesSchema,
	DeVerbImperativeFeaturesSchema,
	DeVerbFiniteFeaturesSchema,
	DeVerbInfinitiveFeaturesSchema,
	DeVerbParticipleFeaturesSchema,
]);

export const DeVerbFeaturesSchema = z.strictObject({
	core: DeVerbCoreFeaturesSchema,
	inflectional: DeVerbInflectionalFeaturesSchema,
});

export type DeVerbFeatures = z.infer<typeof DeVerbFeaturesSchema>;
