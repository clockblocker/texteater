import { z } from "zod";
import type { DeProperNounFeatures } from "../../../../../types/concrete-language/features/de/lexeme/proper-noun.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildOptionalFeatureObjectSchema,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers.js";

export const deProperNounFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({
		abbr: abstractFeatureAtomSchemas.abbr,
		foreign: abstractFeatureAtomSchemas.foreign,
		gender: abstractFeatureAtomSchemas.gender.extract([
			"Fem",
			"Masc",
			"Neut",
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
			number: abstractFeatureAtomSchemas.number.extract(["Plur", "Sing"]),
		}),
	),
}) satisfies z.ZodSchema<DeProperNounFeatures>;
