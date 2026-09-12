import type { Assert } from "common-utils";
import { z } from "zod";
import {
	Aspect,
	FeatureBagKind,
	Gender,
	GrammaticalNumber,
	type IsUniversalFeatureBags,
	Mood,
	Person,
	Tense,
	UNIVERSAL_FEATURE_SCHEMA,
	VerbForm,
	VerbType,
	Voice,
} from "../../../universal/index.js";

const DeVerbAspectSchema = UNIVERSAL_FEATURE_SCHEMA.aspect.extract([
	Aspect.Perf,
]);
const DeVerbGenderSchema = UNIVERSAL_FEATURE_SCHEMA.gender.extract([
	Gender.Fem,
	Gender.Masc,
	Gender.Neut,
]);
const DeVerbMoodSchema = UNIVERSAL_FEATURE_SCHEMA.mood.extract([
	Mood.Ind,
	Mood.Sub,
]);
const DeVerbImperativeMoodSchema = UNIVERSAL_FEATURE_SCHEMA.mood.extract([
	Mood.Imp,
]);
const DeVerbNumberSchema = UNIVERSAL_FEATURE_SCHEMA.number.extract([
	GrammaticalNumber.Plur,
	GrammaticalNumber.Sing,
]);
const DeVerbPersonSchema = UNIVERSAL_FEATURE_SCHEMA.person.extract([
	Person["1"],
	Person["2"],
	Person["3"],
]);
const DeVerbTenseSchema = UNIVERSAL_FEATURE_SCHEMA.tense.extract([
	Tense.Past,
	Tense.Pres,
]);
const DeVerbVoiceSchema = UNIVERSAL_FEATURE_SCHEMA.voice.extract([Voice.Pass]);
const DeVerbFiniteFormSchema = UNIVERSAL_FEATURE_SCHEMA.verbForm.extract([
	VerbForm.Fin,
]);
const DeVerbInfinitiveFormSchema = UNIVERSAL_FEATURE_SCHEMA.verbForm.extract([
	VerbForm.Inf,
]);
const DeVerbParticipleFormSchema = UNIVERSAL_FEATURE_SCHEMA.verbForm.extract([
	VerbForm.Part,
]);
const DeModalVerbTypeSchema = UNIVERSAL_FEATURE_SCHEMA.verbType.extract([
	VerbType.Mod,
]);

const DeVerbUnspecifiedFormFeatureBagSchema = z
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
			error: "Inflectional Feature Bag must contain a marked feature",
		},
	);

const DeVerbImperativeFeatureBagSchema = z.strictObject({
	mood: DeVerbImperativeMoodSchema,
	number: DeVerbNumberSchema.nullable(),
	person: DeVerbPersonSchema.nullable(),
	tense: z.null(),
	verbForm: DeVerbFiniteFormSchema,
	voice: DeVerbVoiceSchema.nullable(),
});

const DeVerbFiniteFeatureBagSchema = z.strictObject({
	mood: DeVerbMoodSchema.nullable(),
	number: DeVerbNumberSchema.nullable(),
	person: DeVerbPersonSchema.nullable(),
	tense: DeVerbTenseSchema.nullable(),
	verbForm: DeVerbFiniteFormSchema,
	voice: DeVerbVoiceSchema.nullable(),
});

const DeVerbInfinitiveFeatureBagSchema = z.strictObject({
	mood: z.null(),
	number: DeVerbNumberSchema.nullable(),
	person: z.null(),
	tense: z.null(),
	verbForm: DeVerbInfinitiveFormSchema,
	voice: DeVerbVoiceSchema.nullable(),
});

const DeVerbParticipleFeatureBagSchema = z.strictObject({
	aspect: DeVerbAspectSchema.nullable(),
	gender: DeVerbGenderSchema.nullable(),
	mood: z.null(),
	number: DeVerbNumberSchema.nullable(),
	person: z.null(),
	tense: DeVerbTenseSchema.nullable(),
	verbForm: DeVerbParticipleFormSchema,
	voice: DeVerbVoiceSchema.nullable(),
});

const DeVerbCoreFeatureBagSchema = z.strictObject({
	hasGovPrep: UNIVERSAL_FEATURE_SCHEMA.hasGovPrep.nullable(),
	hasSepPrefix: UNIVERSAL_FEATURE_SCHEMA.hasSepPrefix.nullable(),
	lexicallyReflexive: UNIVERSAL_FEATURE_SCHEMA.lexicallyReflexive.nullable(),
	verbType: DeModalVerbTypeSchema.nullable(),
});

const DeVerbInflectionalFeatureBagSchema = z.union([
	DeVerbUnspecifiedFormFeatureBagSchema,
	DeVerbImperativeFeatureBagSchema,
	DeVerbFiniteFeatureBagSchema,
	DeVerbInfinitiveFeatureBagSchema,
	DeVerbParticipleFeatureBagSchema,
]);

export const DeVerbFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: DeVerbCoreFeatureBagSchema,
	[FeatureBagKind.Inflectional]: DeVerbInflectionalFeatureBagSchema,
});

export type DeVerbFeatureBags = z.infer<typeof DeVerbFeatureBagsSchema>;

type _DeVerbFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeVerbFeatureBags>
>;
