import { z } from "zod/v3";
import type { DeDeterminerFeatures } from "../../../../../types/concrete-language/features/de/lexeme/determiner";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import {
	buildOptionalFeatureObjectSchema,
	featureValueSet,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers";

export const deDeterminerFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			definite: abstractFeatureAtomSchemas.definite.extract([
				"Def",
				"Ind",
			]),
			extPos: abstractFeatureAtomSchemas.extPos.extract(["ADV", "DET"]),
			foreign: abstractFeatureAtomSchemas.foreign,
			numType: abstractFeatureAtomSchemas.numType.extract([
				"Card",
				"Ord",
			]),
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
				gender: z.union([
					abstractFeatureAtomSchemas.gender.extract(["Masc", "Neut"]),
					z.tuple([z.literal("Masc"), z.literal("Neut")]),
					z.tuple([z.literal("Neut"), z.literal("Masc")]),
				]),
				"gender[psor]": featureValueSet(
					abstractFeatureAtomSchemas.gender.extract([
						"Fem",
						"Masc",
						"Neut",
					]),
				),
				number: abstractFeatureAtomSchemas.number.extract([
					"Plur",
					"Sing",
				]),
				"number[psor]": abstractFeatureAtomSchemas.number.extract([
					"Plur",
					"Sing",
				]),
			}),
		),
	})
	.strict() satisfies z.ZodSchema<DeDeterminerFeatures>;
