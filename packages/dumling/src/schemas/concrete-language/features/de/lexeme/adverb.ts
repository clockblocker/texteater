import { z } from "zod/v3";
import type { DeAdverbFeatures } from "../../../../../types/concrete-language/features/de/lexeme/adverb";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import {
	buildOptionalFeatureObjectSchema,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers";

export const deAdverbFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			foreign: abstractFeatureAtomSchemas.foreign,
			numType: abstractFeatureAtomSchemas.numType.extract([
				"Card",
				"Mult",
			]),
			pronType: abstractFeatureAtomSchemas.pronType.extract([
				"Dem",
				"Ind",
				"Int",
				"Neg",
				"Rel",
			]),
		}),
		inflectional: requireNonEmptyFeatureObject(
			buildOptionalFeatureObjectSchema({
				degree: abstractFeatureAtomSchemas.degree.extract([
					"Cmp",
					"Pos",
					"Sup",
				]),
			}),
		),
	})
	.strict() satisfies z.ZodSchema<DeAdverbFeatures>;
