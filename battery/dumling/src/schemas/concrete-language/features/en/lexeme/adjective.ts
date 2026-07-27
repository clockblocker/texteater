import { z } from "zod/v3";
import type { EnAdjectiveFeatures } from "../../../../../types/concrete-language/features/en/lexeme/adjective";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import {
	buildOptionalFeatureObjectSchema,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers";

export const enAdjectiveFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			abbr: abstractFeatureAtomSchemas.abbr,
			extPos: abstractFeatureAtomSchemas.extPos.extract([
				"ADP",
				"ADV",
				"SCONJ",
			]),
			numForm: abstractFeatureAtomSchemas.numForm.extract([
				"Combi",
				"Word",
			]),
			numType: abstractFeatureAtomSchemas.numType.extract([
				"Frac",
				"Ord",
			]),
			style: abstractFeatureAtomSchemas.style.extract(["Expr"]),
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
	.strict() satisfies z.ZodSchema<EnAdjectiveFeatures>;
