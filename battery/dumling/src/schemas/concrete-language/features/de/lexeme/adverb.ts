import { z } from "zod";
import type { DeAdverbFeatures } from "../../../../../types/concrete-language/features/de/lexeme/adverb.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildOptionalFeatureObjectSchema,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers.js";

export const deAdverbFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({
		foreign: abstractFeatureAtomSchemas.foreign,
		numType: abstractFeatureAtomSchemas.numType.extract(["Card", "Mult"]),
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
}) satisfies z.ZodSchema<DeAdverbFeatures>;
