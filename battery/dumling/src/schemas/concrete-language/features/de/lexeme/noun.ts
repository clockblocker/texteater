import { z } from "zod";
import type { DeNounFeatures } from "../../../../../types/concrete-language/features/de/lexeme/noun.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildOptionalFeatureObjectSchema,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers.js";

export const deNounFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({
		gender: abstractFeatureAtomSchemas.gender.extract([
			"Fem",
			"Masc",
			"Neut",
		]),
		hyph: abstractFeatureAtomSchemas.hyph,
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
}) satisfies z.ZodSchema<DeNounFeatures>;
