import { z } from "zod";
import {
	Aspect,
	DUMLING_FEATURE_SCHEMA,
	FeatureBagKind,
	Gender,
	GrammaticalNumber,
	type IsUniversalFeatureBag,
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
			error: "inflectionalFeatures must not be empty",
		},
	);

const DeVerbImperativeFeatureBagSchema = z.strictObject({
	mood: DUMLING_FEATURE_SCHEMA.mood.extract([Mood.Imp]),
	number: DeVerbNumberSchema.nullable(),
	person: DeVerbPersonSchema.nullable(),
	tense: z.null(),
	verbForm: DUMLING_FEATURE_SCHEMA.verbForm.extract([VerbForm.Fin]),
	voice: DeVerbVoiceSchema.nullable(),
});

const DeVerbFiniteFeatureBagSchema = z.strictObject({
	mood: DeVerbMoodSchema.nullable(),
	number: DeVerbNumberSchema.nullable(),
	person: DeVerbPersonSchema.nullable(),
	tense: DeVerbTenseSchema.nullable(),
	verbForm: DUMLING_FEATURE_SCHEMA.verbForm.extract([VerbForm.Fin]),
	voice: DeVerbVoiceSchema.nullable(),
});

const DeVerbInfinitiveFeatureBagSchema = z.strictObject({
	mood: z.null(),
	number: DeVerbNumberSchema.nullable(),
	person: z.null(),
	tense: z.null(),
	verbForm: DUMLING_FEATURE_SCHEMA.verbForm.extract([VerbForm.Inf]),
	voice: DeVerbVoiceSchema.nullable(),
});

const DeVerbParticipleFeatureBagSchema = z.strictObject({
	aspect: DeVerbAspectSchema.nullable(),
	gender: DeVerbGenderSchema.nullable(),
	mood: z.null(),
	number: DeVerbNumberSchema.nullable(),
	person: z.null(),
	tense: DeVerbTenseSchema.nullable(),
	verbForm: DUMLING_FEATURE_SCHEMA.verbForm.extract([VerbForm.Part]),
	voice: DeVerbVoiceSchema.nullable(),
});

export const DeVerbCoreFeatureBagSchema = z.strictObject({
	hasGovPrep: DUMLING_FEATURE_SCHEMA.hasGovPrep.nullable(),
	hasSepPrefix: DUMLING_FEATURE_SCHEMA.hasSepPrefix.nullable(),
	lexicallyReflexive: DUMLING_FEATURE_SCHEMA.lexicallyReflexive.nullable(),
	verbType: DUMLING_FEATURE_SCHEMA.verbType
		.extract([VerbType.Mod])
		.nullable(),
});

export const DeVerbInflectionalFeatureBagSchema = z.union([
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

export type DeVerbCoreFeatureBag = z.infer<typeof DeVerbCoreFeatureBagSchema>;
export type DeVerbInflectionalFeatureBag = z.infer<
	typeof DeVerbInflectionalFeatureBagSchema
>;
export type DeVerbFeatureBags = z.infer<typeof DeVerbFeatureBagsSchema>;

type Assert<Condition extends true> = Condition;

type _DeVerbCoreFeatureBagIsUniversal = Assert<
	IsUniversalFeatureBag<DeVerbCoreFeatureBag>
>;

type _DeVerbInflectionalFeatureBagIsUniversal = Assert<
	IsUniversalFeatureBag<DeVerbInflectionalFeatureBag>
>;
