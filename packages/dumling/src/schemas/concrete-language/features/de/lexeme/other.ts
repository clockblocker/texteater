import { z } from "zod/v3";
import type { DeOtherFeatures } from "../../../../../types/concrete-language/features/de/lexeme/other";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import {
	buildOptionalFeatureObjectSchema,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers";

export const deOtherFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			abbr: abstractFeatureAtomSchemas.abbr,
			foreign: abstractFeatureAtomSchemas.foreign,
			hyph: abstractFeatureAtomSchemas.hyph,
			numType: abstractFeatureAtomSchemas.numType.extract([
				"Card",
				"Mult",
				"Range",
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
				gender: abstractFeatureAtomSchemas.gender.extract([
					"Fem",
					"Masc",
					"Neut",
				]),
				mood: abstractFeatureAtomSchemas.mood.extract([
					"Imp",
					"Ind",
					"Sub",
				]),
				number: abstractFeatureAtomSchemas.number.extract([
					"Plur",
					"Sing",
				]),
				verbForm: abstractFeatureAtomSchemas.verbForm.extract([
					"Fin",
					"Inf",
					"Part",
				]),
			}),
		),
	})
	.strict() satisfies z.ZodSchema<DeOtherFeatures>;
