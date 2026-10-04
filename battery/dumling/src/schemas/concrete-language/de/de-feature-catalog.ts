import { z } from "zod";
import { UNIVERSAL_FEATURE_SCHEMA } from "../../universal/features/catalog.js";

// Common
const DeGenderSchema = UNIVERSAL_FEATURE_SCHEMA.gender.extract([
	"Fem",
	"Masc",
	"Neut",
]);
const DeMoodSchema = UNIVERSAL_FEATURE_SCHEMA.mood.extract(["Ind", "Sub"]);
const DeImperativeMoodSchema = UNIVERSAL_FEATURE_SCHEMA.mood.extract(["Imp"]);
const DeNumberSchema = UNIVERSAL_FEATURE_SCHEMA.number.extract([
	"Plur",
	"Sing",
]);
const DePersonSchema = UNIVERSAL_FEATURE_SCHEMA.person.extract(["1", "2", "3"]);
const DeTenseSchema = UNIVERSAL_FEATURE_SCHEMA.tense.extract(["Past", "Pres"]);
const DeVoiceSchema = UNIVERSAL_FEATURE_SCHEMA.voice.extract(["Pass", "Cau"]);
const DeFiniteFormSchema = UNIVERSAL_FEATURE_SCHEMA.verbForm.extract(["Fin"]);
const DeInfinitiveFormSchema = UNIVERSAL_FEATURE_SCHEMA.verbForm.extract([
	"Inf",
]);
const DeParticipleFormSchema = UNIVERSAL_FEATURE_SCHEMA.verbForm.extract([
	"Part",
]);
const DeCaseSchema = UNIVERSAL_FEATURE_SCHEMA.case.extract([
	"Acc",
	"Dat",
	"Gen",
	"Nom",
]);
const DeDegreeSchema = UNIVERSAL_FEATURE_SCHEMA.degree.extract([
	"Cmp",
	"Pos",
	"Sup",
]);
const DePoliteSchema = UNIVERSAL_FEATURE_SCHEMA.polite.extract(["Form"]);
const DePronTypeSchema = UNIVERSAL_FEATURE_SCHEMA.pronType.extract([
	"Art",
	"Dem",
	"Ind",
	"Int",
	"Neg",
	"Prs",
	"Rcp",
	"Rel",
	"Tot",
]);
const DePartTypeSchema = UNIVERSAL_FEATURE_SCHEMA.partType.extract([
	"Inf",
	"Mod",
	"Res",
]);
const DePolaritySchema = UNIVERSAL_FEATURE_SCHEMA.polarity.extract(["Neg"]);
const DeArticleSchema = UNIVERSAL_FEATURE_SCHEMA.article.extract(["Definite"]);

// The German Feature Pool (system ADR 0032): German picks from the universal
// pool only the features its routes use, each narrowed here to German's
// values. A route narrows a feature's values only where its Kind uses fewer
// than German's.
export const DE_FEATURE_SCHEMA = {
	comparable: UNIVERSAL_FEATURE_SCHEMA.comparable,
	hasSepPrefix: UNIVERSAL_FEATURE_SCHEMA.hasSepPrefix,
	lexicallyReflexive: UNIVERSAL_FEATURE_SCHEMA.lexicallyReflexive,
	poss: UNIVERSAL_FEATURE_SCHEMA.poss,
	sourceLang: UNIVERSAL_FEATURE_SCHEMA.sourceLang,
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
	case: DeCaseSchema,
	degree: DeDegreeSchema,
	polite: DePoliteSchema,
	pronType: DePronTypeSchema,
	partType: DePartTypeSchema,
	polarity: DePolaritySchema,
	article: DeArticleSchema,
} as const;

// Whole-Surface form and finite coordinates are independent of construction.
const composition = {
	expletive: z.literal("Subject").nullable(),
	perfect: UNIVERSAL_FEATURE_SCHEMA.perfect.nullable(),
	future: UNIVERSAL_FEATURE_SCHEMA.future.nullable(),
};
const finite = {
	mood: DE_FEATURE_SCHEMA.finiteMood.nullable(),
	number: DE_FEATURE_SCHEMA.number.nullable(),
	person: DE_FEATURE_SCHEMA.person.nullable(),
	tense: DE_FEATURE_SCHEMA.tense.nullable(),
	verbForm: DE_FEATURE_SCHEMA.finiteForm,
};
const nonfinite = {
	mood: z.null(),
	number: z.null(),
	person: z.null(),
	tense: z.null(),
};
const forms = [
	finite,
	{ ...finite, mood: DE_FEATURE_SCHEMA.imperativeMood, tense: z.null() },
	{ ...nonfinite, verbForm: DE_FEATURE_SCHEMA.infinitiveForm },
	// Only a perfect or passive participle is verbal; an adjectival one is an
	// ADJ (ADR 0036), so a verbal participle never agrees with a noun.
	{
		...nonfinite,
		verbForm: DE_FEATURE_SCHEMA.participleForm,
		participleForm: UNIVERSAL_FEATURE_SCHEMA.participleForm.nullable(),
	},
] as const;
// Branches enforce voice/subtype consistency in both Zod and compiled validators.
export const DeVerbalInflectionalFeatureBagSchema = z.union(
	forms.flatMap((form) => [
		z.strictObject({
			...form,
			...composition,
			voice: z.null(),
			passive: z.null(),
		}),
		z.strictObject({
			...form,
			...composition,
			voice: DE_FEATURE_SCHEMA.voice.extract(["Pass"]),
			passive: UNIVERSAL_FEATURE_SCHEMA.passive,
		}),
		// Causative lassen (ADR 0026): a voice with no passive subtype.
		z.strictObject({
			...form,
			...composition,
			voice: DE_FEATURE_SCHEMA.voice.extract(["Cau"]),
			passive: z.null(),
		}),
	]),
);
