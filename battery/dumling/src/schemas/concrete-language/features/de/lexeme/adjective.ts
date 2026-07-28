import { z } from "zod";
import type { DeAdjectiveFeatures } from "../../../../../types/concrete-language/features/de/lexeme/adjective.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildOptionalFeatureObjectSchema,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers.js";

export const deAdjectiveFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({
		abbr: abstractFeatureAtomSchemas.abbr,
		foreign: abstractFeatureAtomSchemas.foreign,
		numType: abstractFeatureAtomSchemas.numType.extract(["Card", "Ord"]),
		variant: abstractFeatureAtomSchemas.variant,
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
			gender: abstractFeatureAtomSchemas.gender.extract([
				"Fem",
				"Masc",
				"Neut",
			]),
			number: abstractFeatureAtomSchemas.number.extract(["Plur", "Sing"]),
		}),
	),
}) satisfies z.ZodSchema<DeAdjectiveFeatures>;
