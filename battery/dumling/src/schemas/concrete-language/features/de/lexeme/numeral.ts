import { z } from "zod";
import type { DeNumeralFeatures } from "../../../../../types/concrete-language/features/de/lexeme/numeral.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildOptionalFeatureObjectSchema,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers.js";

export const deNumeralFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({
		abbr: abstractFeatureAtomSchemas.abbr,
		foreign: abstractFeatureAtomSchemas.foreign,
		numType: abstractFeatureAtomSchemas.numType.extract([
			"Card",
			"Frac",
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
			number: abstractFeatureAtomSchemas.number.extract(["Plur", "Sing"]),
		}),
	),
}) satisfies z.ZodSchema<DeNumeralFeatures>;
