import { z } from "zod/v3";
import type { DeNumeralFeatures } from "../../../../../types/concrete-language/features/de/lexeme/numeral";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import {
	buildOptionalFeatureObjectSchema,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers";

export const deNumeralFeaturesSchema = z
	.object({
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
				number: abstractFeatureAtomSchemas.number.extract([
					"Plur",
					"Sing",
				]),
			}),
		),
	})
	.strict() satisfies z.ZodSchema<DeNumeralFeatures>;
