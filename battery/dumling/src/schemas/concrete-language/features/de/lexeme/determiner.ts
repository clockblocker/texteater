import { z } from "zod";
import type { DeDeterminerFeatures } from "../../../../../types/concrete-language/features/de/lexeme/determiner.js";
import { hasDistinctPair } from "../../../../../validation-semantics.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildOptionalFeatureObjectSchema,
	featureValueSet,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers.js";

const deDeterminerGenderSchema = z.union([
	abstractFeatureAtomSchemas.gender.extract(["Masc", "Neut"]),
	z
		.array(abstractFeatureAtomSchemas.gender.extract(["Masc", "Neut"]))
		.length(2)
		.refine(hasDistinctPair),
]) as z.ZodType<
	DeDeterminerFeatures["inflectional"]["gender"] extends infer TGender
		? Exclude<TGender, null>
		: never
>;

export const deDeterminerFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({
		definite: abstractFeatureAtomSchemas.definite.extract(["Def", "Ind"]),
		extPos: abstractFeatureAtomSchemas.extPos.extract(["ADV", "DET"]),
		foreign: abstractFeatureAtomSchemas.foreign,
		numType: abstractFeatureAtomSchemas.numType.extract(["Card", "Ord"]),
		person: abstractFeatureAtomSchemas.person.extract(["1", "2", "3"]),
		polite: abstractFeatureAtomSchemas.polite.extract(["Form", "Infm"]),
		poss: abstractFeatureAtomSchemas.poss,
		pronType: abstractFeatureAtomSchemas.pronType.extract([
			"Art",
			"Dem",
			"Emp",
			"Exc",
			"Ind",
			"Int",
			"Neg",
			"Prs",
			"Rel",
			"Tot",
		]),
	}),
	inflectional: requireNonEmptyFeatureObject(
		buildOptionalFeatureObjectSchema({
			case: abstractFeatureAtomSchemas.case.extract([
				"Acc",
				"Dat",
				"Gen",
				"Nom",
			]),
			degree: abstractFeatureAtomSchemas.degree.extract([
				"Cmp",
				"Pos",
				"Sup",
			]),
			gender: deDeterminerGenderSchema,
			"gender[psor]": featureValueSet(
				abstractFeatureAtomSchemas.gender.extract([
					"Fem",
					"Masc",
					"Neut",
				]),
			),
			number: abstractFeatureAtomSchemas.number.extract(["Plur", "Sing"]),
			"number[psor]": abstractFeatureAtomSchemas.number.extract([
				"Plur",
				"Sing",
			]),
		}),
	),
}) satisfies z.ZodSchema<DeDeterminerFeatures>;
