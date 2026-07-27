import { z } from "zod/v3";
import type { EnNounFeatures } from "../../../../../types/concrete-language/features/en/lexeme/noun";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import {
	buildOptionalFeatureObjectSchema,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers";

export const enNounFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			abbr: abstractFeatureAtomSchemas.abbr,
			extPos: abstractFeatureAtomSchemas.extPos.extract(["ADV", "PROPN"]),
			foreign: abstractFeatureAtomSchemas.foreign,
			numForm: abstractFeatureAtomSchemas.numForm.extract([
				"Combi",
				"Digit",
				"Word",
			]),
			numType: abstractFeatureAtomSchemas.numType.extract([
				"Card",
				"Frac",
				"Ord",
			]),
			style: abstractFeatureAtomSchemas.style.extract(["Expr", "Vrnc"]),
		}),
		inflectional: requireNonEmptyFeatureObject(
			buildOptionalFeatureObjectSchema({
				number: abstractFeatureAtomSchemas.number.extract([
					"Plur",
					"Ptan",
					"Sing",
				]),
			}),
		),
	})
	.strict() satisfies z.ZodSchema<EnNounFeatures>;
